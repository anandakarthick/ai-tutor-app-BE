import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { LearningSession, SessionStatus } from '../entities/LearningSession';
import { ChatMessage, SenderType, MessageType } from '../entities/ChatMessage';
import { StudentProgress, MasteryLevel } from '../entities/StudentProgress';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { e2eEncryption } from '../middlewares/encryption';
import { cacheService } from '../config/redis';
import aiService from '../services/ai.service';
import speechService from '../services/speech.service';

const router = Router();

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

    await sessionRepository.update(id, {
      status: SessionStatus.COMPLETED,
      endedAt,
      durationSeconds,
      xpEarned,
    });

    // Update student progress
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

    progress.totalTimeSpentMinutes += Math.ceil(durationSeconds / 60);
    progress.lastAccessedAt = new Date();
    await progressRepository.save(progress);

    res.json({ success: true, message: 'Session ended', data: { durationSeconds } });
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
    const aiResponse = await aiService.conductTeachingSession({
      studentName: session.student.studentName,
      grade: session.topic?.chapter?.book?.subject?.class?.displayName || 'Student',
      subject: session.topic?.chapter?.book?.subject?.displayName || 'Subject',
      topic: session.topic?.topicTitle || 'Topic',
      content: content,
      previousContext: '', // Could include previous messages here
    });

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
    if (Number(progressPercentage) >= 100 && !progress.completedAt) {
      progress.completedAt = new Date();
      console.log('[learning/progress] Marking topic as completed');
    }

    await progressRepository.save(progress);
    console.log('[learning/progress] Progress saved:', progress);

    // Invalidate progress cache so LearnScreen gets updated data
    await cacheService.del(`progress:${studentId}:overall`);
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

    // Stream the teaching content
    for await (const chunk of aiService.streamTeaching(teachingContext)) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
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
    const aiResponse = await aiService.conductTeachingSession({
      studentName: session.student?.studentName || 'Student',
      grade: session.topic?.chapter?.book?.subject?.class?.displayName || 'Student',
      subject: session.topic?.chapter?.book?.subject?.displayName || 'Subject',
      topic: session.topic?.topicTitle || 'Topic',
      content: messageText,
    });

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
