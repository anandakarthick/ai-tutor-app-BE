import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Quiz } from '../entities/Quiz';
import { Question } from '../entities/Question';
import { QuizAttempt, AttemptStatus } from '../entities/QuizAttempt';
import { AnswerResponse } from '../entities/AnswerResponse';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * @route   GET /api/v1/quizzes
 * @desc    Get quizzes by topic
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
    const { id } = req.params;

    const quizRepository = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepository.findOne({
      where: { id, isActive: true },
      relations: ['questions'],
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Shuffle questions if enabled
    if (quiz.shuffleQuestions && quiz.questions) {
      quiz.questions = quiz.questions.sort(() => Math.random() - 0.5);
    }

    // Remove correct answers from response
    quiz.questions = quiz.questions?.map(q => ({
      ...q,
      correctAnswer: undefined,
      explanation: undefined,
    })) as Question[];

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
    const { id } = req.params;
    const { studentId } = req.body;

    const quizRepository = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepository.findOne({ where: { id } });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const attemptRepository = AppDataSource.getRepository(QuizAttempt);
    const attempt = attemptRepository.create({
      studentId,
      quizId: id,
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
    const { attemptId } = req.params;
    const { questionId, studentAnswer, timeTaken = 0 } = req.body;

    const questionRepository = AppDataSource.getRepository(Question);
    const question = await questionRepository.findOne({ where: { id: questionId } });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const isCorrect = studentAnswer === question.correctAnswer;
    const marksObtained = isCorrect ? question.marks : (question.negativeMarks ? -question.negativeMarks : 0);

    const responseRepository = AppDataSource.getRepository(AnswerResponse);
    const response = responseRepository.create({
      attemptId,
      questionId,
      studentAnswer,
      isCorrect,
      marksObtained,
      timeTakenSeconds: timeTaken,
    });

    await responseRepository.save(response);

    res.json({ success: true, data: response });
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
    const { attemptId } = req.params;

    const attemptRepository = AppDataSource.getRepository(QuizAttempt);
    const responseRepository = AppDataSource.getRepository(AnswerResponse);
    const quizRepository = AppDataSource.getRepository(Quiz);

    const attempt = await attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz'],
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    // Calculate results
    const responses = await responseRepository.find({ where: { attemptId } });
    
    const correctAnswers = responses.filter(r => r.isCorrect).length;
    const wrongAnswers = responses.filter(r => !r.isCorrect && !r.isSkipped).length;
    const marksObtained = responses.reduce((sum, r) => sum + Number(r.marksObtained), 0);
    const totalTimeTaken = responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0);
    const percentage = (marksObtained / Number(attempt.totalMarks)) * 100;
    const isPassed = percentage >= Number(attempt.quiz?.passingPercentage || 40);

    // Calculate XP earned
    const xpEarned = Math.floor(correctAnswers * 10 + (isPassed ? 50 : 0));

    await attemptRepository.update(attemptId, {
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      attemptedQuestions: responses.length,
      correctAnswers,
      wrongAnswers,
      marksObtained,
      percentage,
      timeTakenSeconds: totalTimeTaken,
      isPassed,
      xpEarned,
    });

    const updatedAttempt = await attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['responses', 'quiz'],
    });

    res.json({ success: true, data: updatedAttempt });
  } catch (error) {
    next(error);
  }
});

export default router;
