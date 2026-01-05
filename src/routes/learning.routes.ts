import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { LearningSession, SessionStatus } from '../entities/LearningSession';
import { ChatMessage, SenderType, MessageType } from '../entities/ChatMessage';
import { StudentProgress, MasteryLevel } from '../entities/StudentProgress';
import { DailyProgress } from '../entities/DailyProgress';
import { Student } from '../entities/Student';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { e2eEncryption } from '../middlewares/encryption';
import { cacheService } from '../config/redis';
import aiService from '../services/ai.service';
import speechService from '../services/speech.service';

const router = Router();

/**
 * Helper function to update daily progress
 */
async function updateDailyProgress(
  studentId: string, 
  studyTimeMinutes: number = 0, 
  topicsCompleted: number = 0,
  xpEarned: number = 0
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyRepository = AppDataSource.getRepository(DailyProgress);
  let daily = await dailyRepository.findOne({
    where: { studentId, date: today },
  });

  if (!daily) {
    // Get previous streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayProgress = await dailyRepository.findOne({
      where: { studentId, date: yesterday },
    });

    daily = dailyRepository.create({
      studentId,
      date: today,
      streakDays: yesterdayProgress ? yesterdayProgress.streakDays + 1 : 1,
      totalStudyTimeMinutes: 0,
      topicsCompleted: 0,
      quizzesAttempted: 0,
      doubtsAsked: 0,
      xpEarned: 0,
    });
  }

  daily.totalStudyTimeMinutes += studyTimeMinutes;
  daily.topicsCompleted += topicsCompleted;
  daily.xpEarned += xpEarned;
  
  await dailyRepository.save(daily);

  // Update student streak and lastActivityDate
  const studentRepository = AppDataSource.getRepository(Student);
  await studentRepository.update(studentId, {
    streakDays: daily.streakDays,
    lastActivityDate: today,
  });

  console.log(`[DailyProgress] Updated for student ${studentId}: +${studyTimeMinutes}min, +${topicsCompleted} topics, +${xpEarned}xp`);

  // Invalidate cache
  await cacheService.del(`progress:${studentId}:overall`);
  await cacheService.del(`dashboard:stats:${studentId}`);

  return daily;
}

/**
 * @route   POST /api/v1/learning/session
 * @desc    Start a learning session (supports E2E encryption)
 * @access  Private
 */
router.post('/session', authenticate, e2eEncryption, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, topicId, sessionType = 'learning' } = req.body;

    const sessionRepository = AppDataSource.getRepository(LearningSession);
    const session = sessionRepository.create({
      studentId,
      topicId,
      sessionType,
      status: SessionStatus.ACTIVE,
      startedAt: new Date(),
    });

    await sessionRepository.save(session);

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/learning/session/:id/end
 * @desc    End a learning session
 * @access  Private
 */
router.put('/session/:id/end', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { xpEarned = 0 } = req.body;

    const sessionRepository = AppDataSource.getRepository(LearningSession);
    const session = await sessionRepository.findOne({ where: { id } });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - session.startedAt!.getTime()) / 1000);
    const durationMinutes = Math.ceil(durationSeconds / 60);

    await sessionRepository.update(id, {
      status: SessionStatus.COMPLETED,
      endedAt,
      durationSeconds,
      xpEarned,
    });

    // Update student progress for the topic
    const progressRepository = AppDataSource.getRepository(StudentProgress);
    let progress = await progressRepository.findOne({
      where: { studentId: session.studentId, topicId: session.topicId },
    });

    if (!progress) {
      progress = progressRepository.create({
        studentId: session.studentId,
        topicId: session.topicId,
      });
    }

    progress.totalTimeSpentMinutes += durationMinutes;
    progress.lastAccessedAt = new Date();
    await progressRepository.save(progress);

    // Update daily progress
    await updateDailyProgress(session.studentId, durationMinutes, 0, xpEarned);

    console.log(`[Session End] Student ${session.studentId}: ${durationMinutes}min, ${xpEarned}xp`);

    res.json({ success: true, message: 'Session ended', data: { durationSeconds, durationMinutes } });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/learning/session/:id/message
 * @desc    Send message in learning session (supports E2E encryption)
 * @access  Private
 */
router.post('/session/:id/message', authenticate, e2eEncryption, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { content, messageType = 'text' } = req.body;

    const sessionRepository = AppDataSource.getRepository(LearningSession);
    const session = await sessionRepository.findOne({
      where: { id },
      relations: ['topic', 'topic.chapter', 'topic.chapter.book', 'topic.chapter.book.subject', 'student'],
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const messageRepository = AppDataSource.getRepository(ChatMessage);

    // Save user message
    const userMessage = messageRepository.create({
      sessionId: id,
      senderType: SenderType.STUDENT,
      messageType: messageType as MessageType,
      content,
    });
    await messageRepository.save(userMessage);

    // Get AI response
    let aiResponse: string;
    try {
      aiResponse = await aiService.conductTeachingSession({
        studentName: session.student.studentName,
        grade: session.topic?.chapter?.book?.subject?.class?.displayName || 'Student',
        subject: session.topic?.chapter?.book?.subject?.displayName || 'Subject',
        topic: session.topic?.topicTitle || 'Topic',
        content: content,
        previousContext: '', // Could include previous messages here
      });
    } catch (aiError) {
      console.log('[learning/message] AI service failed, using fallback response');
      aiResponse = generateFallbackChatResponse(content, session.student.studentName, session.topic?.topicTitle || 'this topic');
    }

    // Save AI message
    const aiMessage = messageRepository.create({
      sessionId: id,
      senderType: SenderType.AI,
      messageType: MessageType.EXPLANATION,
      content: aiResponse,
    });
    await messageRepository.save(aiMessage);

    // Update session stats
    await sessionRepository.update(id, {
      aiInteractions: () => 'ai_interactions + 1',
    });

    res.json({
      success: true,
      data: {
        userMessage,
        aiMessage,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/learning/session/:id/messages
 * @desc    Get session messages
 * @access  Private
 */
router.get('/session/:id/messages', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const messageRepository = AppDataSource.getRepository(ChatMessage);
    const messages = await messageRepository.find({
      where: { sessionId: id },
      order: { createdAt: 'ASC' },
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/learning/progress/:studentId/:topicId
 * @desc    Get topic progress for a student
 * @access  Private
 */
router.get('/progress/:studentId/:topicId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, topicId } = req.params;
    
    console.log('[learning/progress] Getting progress:', { studentId, topicId });

    const progressRepository = AppDataSource.getRepository(StudentProgress);
    const progress = await progressRepository.findOne({
      where: { studentId, topicId },
    });

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    console.log('[learning/progress] Found progress:', progress);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.log('[learning/progress] Error:', error);
    next(error);
  }
});

/**
 * @route   PUT /api/v1/learning/progress
 * @desc    Update topic progress
 * @access  Private
 */
router.put('/progress', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, topicId, progressPercentage, masteryLevel } = req.body;
    
    console.log('[learning/progress] Updating progress:', { studentId, topicId, progressPercentage, masteryLevel });

    const progressRepository = AppDataSource.getRepository(StudentProgress);
    let progress = await progressRepository.findOne({
      where: { studentId, topicId },
    });

    const wasCompleted = progress?.completedAt != null;

    if (!progress) {
      console.log('[learning/progress] Creating new progress record');
      progress = progressRepository.create({ studentId, topicId });
    }

    progress.progressPercentage = progressPercentage;
    progress.lastAccessedAt = new Date();
    
    if (masteryLevel) {
      progress.masteryLevel = masteryLevel as MasteryLevel;
    }
    
    // Mark as completed if progress is 100%
    let topicJustCompleted = false;
    if (Number(progressPercentage) >= 100 && !progress.completedAt) {
      progress.completedAt = new Date();
      topicJustCompleted = true;
      console.log('[learning/progress] Marking topic as completed');
    }

    await progressRepository.save(progress);
    console.log('[learning/progress] Progress saved:', progress);

    // Update daily progress if topic just completed
    if (topicJustCompleted && !wasCompleted) {
      await updateDailyProgress(studentId, 0, 1, 10); // 10 XP for completing a topic
      console.log('[learning/progress] Daily progress updated for topic completion');
    }

    // Invalidate progress cache so LearnScreen gets updated data
    await cacheService.del(`progress:${studentId}:overall`);
    await cacheService.del(`dashboard:stats:${studentId}`);
    console.log('[learning/progress] Cache invalidated for student:', studentId);

    res.json({ success: true, data: progress });
  } catch (error) {
    console.log('[learning/progress] Error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/v1/learning/teach
 * @desc    Stream AI teaching content
 * @access  Private
 */
router.post('/teach', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentName, grade, subject, topic, content } = req.body;
    
    console.log('[learning/teach] Starting AI teaching for:', { studentName, topic });

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const teachingContext = {
      studentName: studentName || 'Student',
      grade: grade || 'Class 6',
      subject: subject || 'General',
      topic: topic || 'Lesson',
      content: content || 'General concepts',
    };

    try {
      // Try to stream the teaching content from AI
      for await (const chunk of aiService.streamTeaching(teachingContext)) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    } catch (aiError: any) {
      console.log('[learning/teach] AI service failed, using fallback content');
      
      // Fallback content when AI is not available
      const fallbackContent = generateFallbackTeachingContent(teachingContext);
      
      // Stream fallback content character by character to simulate typing
      for (let i = 0; i < fallbackContent.length; i += 3) {
        const chunk = fallbackContent.substring(i, i + 3);
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for effect
      }
    }

    // Send done signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    
  } catch (error) {
    console.log('[learning/teach] Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Teaching stream failed' })}\n\n`);
    res.end();
  }
});

/**
 * Generate fallback teaching content when AI is unavailable
 */
function generateFallbackTeachingContent(context: { studentName: string; grade: string; subject: string; topic: string; content: string }): string {
  return `Hello ${context.studentName}! 👋

Welcome to today's lesson on **${context.topic}**!

Let me explain this topic to you in a simple way:

📚 **What is ${context.topic}?**

${context.content || `${context.topic} is an important concept in ${context.subject}. Understanding this will help you solve many problems!`}

🎯 **Key Points to Remember:**

• Take your time to understand each concept
• Practice with examples to strengthen your understanding
• Don't hesitate to ask questions if something is unclear
• Try to relate new concepts to things you already know

💡 **Quick Tip:**
The best way to learn is by doing! Try solving some practice problems after reading through the material.

🤔 **Think About This:**
Can you think of any real-life examples where you might use ${context.topic}?

Keep up the great work, ${context.studentName}! Remember, every expert was once a beginner. 🌟

Feel free to ask me any questions about this topic!`;
}

/**
 * Generate fallback chat response when AI is unavailable
 */
function generateFallbackChatResponse(question: string, studentName: string, topic: string): string {
  const responses = [
    `Great question, ${studentName}! 🌟\n\nRegarding "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}":\n\nThis is related to ${topic}. Let me help you understand this better.\n\nThe key thing to remember is to break down the problem into smaller parts. Try to identify what you already know and what you need to find out.\n\nWould you like me to explain any specific part in more detail?`,
    
    `That's a thoughtful question! 💡\n\nWhen thinking about ${topic}, it helps to:\n\n1. Understand the basic concepts first\n2. Look at examples to see how they're applied\n3. Practice with similar problems\n\nIs there a specific part you'd like me to clarify?`,
    
    `I'm glad you asked, ${studentName}! 📚\n\nThis is an important concept in ${topic}. Here's a simple way to think about it:\n\n• Start with what you know\n• Apply the concepts step by step\n• Check your answer to make sure it makes sense\n\nKeep practicing and you'll master this in no time! 🎯`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * @route   POST /api/v1/learning/tts
 * @desc    Convert text to speech
 * @access  Private
 */
router.post('/tts', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text, language = 'en-IN' } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    console.log('[learning/tts] Converting text to speech:', text.substring(0, 50));

    const audioBase64 = await speechService.textToSpeech(text, language);
    
    if (!audioBase64) {
      return res.status(500).json({ success: false, message: 'TTS conversion failed' });
    }

    res.json({ 
      success: true, 
      data: { 
        audio: audioBase64,
        format: 'mp3',
        language 
      } 
    });
  } catch (error) {
    console.log('[learning/tts] Error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/v1/learning/tts/chunks
 * @desc    Convert long text to speech in chunks (for teaching)
 * @access  Private
 */
router.post('/tts/chunks', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text, language = 'en-IN' } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    console.log('[learning/tts/chunks] Converting text chunks to speech');

    const audioChunks = await speechService.textToSpeechChunks(text, language);
    
    res.json({ 
      success: true, 
      data: { 
        chunks: audioChunks,
        count: audioChunks.length,
        format: 'mp3',
        language 
      } 
    });
  } catch (error) {
    console.log('[learning/tts/chunks] Error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/v1/learning/voice-message
 * @desc    Send voice message - converts to text and gets AI response with audio
 * @access  Private
 */
router.post('/voice-message', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId, audioBase64, transcription } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    // If transcription is provided directly (from client-side STT), use it
    // Otherwise, we would convert audio to text here
    let messageText = transcription || '';
    
    if (!messageText && audioBase64) {
      // In production, call speech-to-text service here
      // For now, we'll require client to send transcription
      return res.status(400).json({ 
        success: false, 
        message: 'Transcription required. Use device speech-to-text.' 
      });
    }

    if (!messageText) {
      return res.status(400).json({ success: false, message: 'No message content' });
    }

    console.log('[learning/voice-message] Processing voice message:', messageText.substring(0, 50));

    // Get session with relations
    const sessionRepository = AppDataSource.getRepository(LearningSession);
    const session = await sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['topic', 'topic.chapter', 'topic.chapter.book', 'topic.chapter.book.subject', 'student'],
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const messageRepository = AppDataSource.getRepository(ChatMessage);

    // Save user message
    const userMessage = messageRepository.create({
      sessionId,
      senderType: SenderType.STUDENT,
      messageType: MessageType.VOICE,
      content: messageText,
    });
    await messageRepository.save(userMessage);

    // Get AI response
    let aiResponse: string;
    try {
      aiResponse = await aiService.conductTeachingSession({
        studentName: session.student?.studentName || 'Student',
        grade: session.topic?.chapter?.book?.subject?.class?.displayName || 'Student',
        subject: session.topic?.chapter?.book?.subject?.displayName || 'Subject',
        topic: session.topic?.topicTitle || 'Topic',
        content: messageText,
      });
    } catch (aiError) {
      console.log('[learning/voice-message] AI service failed, using fallback response');
      aiResponse = generateFallbackChatResponse(messageText, session.student?.studentName || 'Student', session.topic?.topicTitle || 'this topic');
    }

    // Save AI message
    const aiMessage = messageRepository.create({
      sessionId,
      senderType: SenderType.AI,
      messageType: MessageType.EXPLANATION,
      content: aiResponse,
    });
    await messageRepository.save(aiMessage);

    // Convert AI response to speech
    const audioBase64Response = await speechService.textToSpeech(aiResponse, 'en-IN');

    // Update session stats
    await sessionRepository.update(sessionId, {
      aiInteractions: () => 'ai_interactions + 1',
    });

    res.json({
      success: true,
      data: {
        userMessage,
        aiMessage,
        aiAudio: audioBase64Response,
        audioFormat: 'mp3',
      },
    });
  } catch (error) {
    console.log('[learning/voice-message] Error:', error);
    next(error);
  }
});

export default router;
