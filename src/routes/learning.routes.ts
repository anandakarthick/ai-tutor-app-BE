import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { LearningSession, SessionStatus } from '../entities/LearningSession';
import { ChatMessage, SenderType, MessageType } from '../entities/ChatMessage';
import { StudentProgress, MasteryLevel } from '../entities/StudentProgress';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { e2eEncryption } from '../middlewares/encryption';
import aiService from '../services/ai.service';

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
 * @route   PUT /api/v1/learning/progress
 * @desc    Update topic progress
 * @access  Private
 */
router.put('/progress', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, topicId, progressPercentage, masteryLevel } = req.body;

    const progressRepository = AppDataSource.getRepository(StudentProgress);
    let progress = await progressRepository.findOne({
      where: { studentId, topicId },
    });

    if (!progress) {
      progress = progressRepository.create({ studentId, topicId });
    }

    progress.progressPercentage = progressPercentage;
    if (masteryLevel) {
      progress.masteryLevel = masteryLevel as MasteryLevel;
    }
    if (progressPercentage === 100 && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    await progressRepository.save(progress);

    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
});

export default router;
