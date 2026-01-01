import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { LearningSession, SessionType, SessionStatus } from '../entities/LearningSession';
import { ChatMessage, SenderType, MessageType } from '../entities/ChatMessage';
import { StudentProgress, MasteryLevel } from '../entities/StudentProgress';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * @route   POST /api/v1/learning/session
 * @desc    Start a learning session
 * @access  Private
 */
router.post('/session', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, topicId, sessionType = 'learning' } = req.body;

    const sessionRepository = AppDataSource.getRepository(LearningSession);
    const session = sessionRepository.create({
      studentId,
      topicId,
      sessionType: sessionType as SessionType,
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
    const sessionRepository = AppDataSource.getRepository(LearningSession);
    const session = await sessionRepository.findOne({ where: { id: req.params.id } });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.status = SessionStatus.COMPLETED;
    session.endedAt = new Date();
    session.durationSeconds = Math.floor((session.endedAt.getTime() - session.startedAt!.getTime()) / 1000);

    await sessionRepository.save(session);

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/learning/session/:id/message
 * @desc    Send message in learning session
 * @access  Private
 */
router.post('/session/:id/message', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content, messageType = 'text' } = req.body;

    const messageRepository = AppDataSource.getRepository(ChatMessage);
    const message = messageRepository.create({
      sessionId: req.params.id,
      senderType: SenderType.STUDENT,
      messageType: messageType as MessageType,
      content,
    });

    await messageRepository.save(message);

    // TODO: Add AI response here using Claude API

    res.status(201).json({ success: true, data: message });
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
    const messageRepository = AppDataSource.getRepository(ChatMessage);
    const messages = await messageRepository.find({
      where: { sessionId: req.params.id },
      order: { createdAt: 'ASC' },
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/learning/progress
 * @desc    Update learning progress
 * @access  Private
 */
router.put('/progress', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, topicId, progressPercentage, timeSpent } = req.body;

    const progressRepository = AppDataSource.getRepository(StudentProgress);
    let progress = await progressRepository.findOne({ where: { studentId, topicId } });

    if (!progress) {
      progress = progressRepository.create({ studentId, topicId });
    }

    progress.progressPercentage = progressPercentage;
    progress.totalTimeSpentMinutes += timeSpent || 0;
    progress.lastAccessedAt = new Date();

    // Update mastery level based on progress
    if (progressPercentage >= 90) {
      progress.masteryLevel = MasteryLevel.MASTERED;
    } else if (progressPercentage >= 70) {
      progress.masteryLevel = MasteryLevel.PROFICIENT;
    } else if (progressPercentage >= 50) {
      progress.masteryLevel = MasteryLevel.PRACTICING;
    } else if (progressPercentage >= 20) {
      progress.masteryLevel = MasteryLevel.LEARNING;
    }

    await progressRepository.save(progress);

    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
});

export default router;
