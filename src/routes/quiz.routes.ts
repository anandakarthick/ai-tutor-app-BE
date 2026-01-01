import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Quiz } from '../entities/Quiz';
import { Question } from '../entities/Question';
import { QuizAttempt, AttemptStatus } from '../entities/QuizAttempt';
import { AnswerResponse } from '../entities/AnswerResponse';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * @route   GET /api/v1/quizzes
 * @desc    Get quizzes
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { topicId, quizType } = req.query;

    const quizRepository = AppDataSource.getRepository(Quiz);
    const query: any = { isActive: true };
    
    if (topicId) query.topicId = topicId;
    if (quizType) query.quizType = quizType;

    const quizzes = await quizRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
    });

    res.json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/quizzes/:id
 * @desc    Get quiz with questions
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const quizRepository = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepository.findOne({
      where: { id: req.params.id },
      relations: ['questions'],
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    res.json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/quizzes/:id/attempt
 * @desc    Start quiz attempt
 * @access  Private
 */
router.post('/:id/attempt', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.body;

    const quizRepository = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepository.findOne({ where: { id: req.params.id } });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const attemptRepository = AppDataSource.getRepository(QuizAttempt);
    const attempt = attemptRepository.create({
      studentId,
      quizId: req.params.id,
      startedAt: new Date(),
      status: AttemptStatus.IN_PROGRESS,
      totalQuestions: quiz.totalQuestions,
      totalMarks: quiz.totalMarks,
    });

    await attemptRepository.save(attempt);

    res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/quizzes/attempts/:attemptId/answer
 * @desc    Submit answer for a question
 * @access  Private
 */
router.post('/attempts/:attemptId/answer', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { questionId, studentAnswer, timeTaken } = req.body;

    const questionRepository = AppDataSource.getRepository(Question);
    const question = await questionRepository.findOne({ where: { id: questionId } });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const isCorrect = studentAnswer === question.correctAnswer;
    const marksObtained = isCorrect ? question.marks : (question.negativeMarks ? -question.negativeMarks : 0);

    const responseRepository = AppDataSource.getRepository(AnswerResponse);
    const response = responseRepository.create({
      attemptId: req.params.attemptId,
      questionId,
      studentAnswer,
      isCorrect,
      marksObtained,
      timeTakenSeconds: timeTaken || 0,
    });

    await responseRepository.save(response);

    res.status(201).json({ success: true, data: { ...response, explanation: question.explanation } });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/quizzes/attempts/:attemptId/submit
 * @desc    Submit quiz attempt
 * @access  Private
 */
router.put('/attempts/:attemptId/submit', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const attemptRepository = AppDataSource.getRepository(QuizAttempt);
    const responseRepository = AppDataSource.getRepository(AnswerResponse);

    const attempt = await attemptRepository.findOne({ where: { id: req.params.attemptId } });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    const responses = await responseRepository.find({ where: { attemptId: req.params.attemptId } });

    const correctAnswers = responses.filter(r => r.isCorrect).length;
    const wrongAnswers = responses.filter(r => !r.isCorrect && !r.isSkipped).length;
    const marksObtained = responses.reduce((sum, r) => sum + r.marksObtained, 0);

    attempt.status = AttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();
    attempt.attemptedQuestions = responses.length;
    attempt.correctAnswers = correctAnswers;
    attempt.wrongAnswers = wrongAnswers;
    attempt.marksObtained = marksObtained;
    attempt.percentage = (marksObtained / attempt.totalMarks) * 100;
    attempt.timeTakenSeconds = Math.floor((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000);

    await attemptRepository.save(attempt);

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
});

export default router;
