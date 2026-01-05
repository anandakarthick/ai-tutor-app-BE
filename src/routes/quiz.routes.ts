import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Quiz } from '../entities/Quiz';
import { Question } from '../entities/Question';
import { QuizAttempt, AttemptStatus } from '../entities/QuizAttempt';
import { AnswerResponse } from '../entities/AnswerResponse';
import { DailyProgress } from '../entities/DailyProgress';
import { Student } from '../entities/Student';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * Helper function to update daily progress
 */
async function updateDailyProgress(
  studentId: string, 
  studyTimeMinutes: number = 0, 
  topicsCompleted: number = 0,
  quizzesAttempted: number = 0,
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
  daily.quizzesAttempted += quizzesAttempted;
  daily.xpEarned += xpEarned;
  
  await dailyRepository.save(daily);

  // Update student streak, lastActivityDate, and XP
  const studentRepository = AppDataSource.getRepository(Student);
  await studentRepository.increment({ id: studentId }, 'xp', xpEarned);
  await studentRepository.update(studentId, {
    streakDays: daily.streakDays,
    lastActivityDate: today,
  });

  console.log(`[DailyProgress] Updated for student ${studentId}: quiz +${quizzesAttempted}, +${xpEarned}xp`);

  // Invalidate cache
  await cacheService.del(`progress:${studentId}:overall`);
  await cacheService.del(`dashboard:stats:${studentId}`);

  return daily;
}

/**
 * @route   GET /api/v1/quizzes
 * @desc    Get quizzes by topic
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { topicId, quizType } = req.query;

    console.log(`[Quizzes API] Getting quizzes, topicId: ${topicId}, quizType: ${quizType}`);

    const quizRepository = AppDataSource.getRepository(Quiz);
    const query: any = { isActive: true };
    
    if (topicId) query.topicId = topicId;
    if (quizType) query.quizType = quizType;

    const quizzes = await quizRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
    });

    console.log(`[Quizzes API] Found ${quizzes.length} quizzes`);

    res.json({ success: true, data: quizzes });
  } catch (error) {
    console.error('[Quizzes API] Error:', error);
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

    console.log(`[Quizzes API] Getting quiz: ${id}`);

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

    console.log(`[Quizzes API] Quiz found with ${quiz.questions?.length || 0} questions`);

    res.json({ success: true, data: quiz });
  } catch (error) {
    console.error('[Quizzes API] Error:', error);
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

    console.log(`[Quizzes API] Starting attempt for quiz: ${id}, student: ${studentId}`);

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

    console.log(`[Quizzes API] Attempt created: ${attempt.id}`);

    res.status(201).json({ success: true, data: attempt });
  } catch (error) {
    console.error('[Quizzes API] Error:', error);
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

    console.log(`[Quizzes API] Submitting answer for attempt: ${attemptId}, question: ${questionId}`);

    const questionRepository = AppDataSource.getRepository(Question);
    const question = await questionRepository.findOne({ where: { id: questionId } });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const isCorrect = studentAnswer === question.correctAnswer;
    const marksObtained = isCorrect ? question.marks : (question.negativeMarks ? -question.negativeMarks : 0);

    const responseRepository = AppDataSource.getRepository(AnswerResponse);
    
    // Check if answer already exists
    let response = await responseRepository.findOne({
      where: { attemptId, questionId },
    });
    
    if (response) {
      // Update existing answer
      response.studentAnswer = studentAnswer;
      response.isCorrect = isCorrect;
      response.marksObtained = marksObtained;
      response.timeTakenSeconds = timeTaken;
    } else {
      // Create new answer
      response = responseRepository.create({
        attemptId,
        questionId,
        studentAnswer,
        isCorrect,
        marksObtained,
        timeTakenSeconds: timeTaken,
      });
    }

    await responseRepository.save(response);

    console.log(`[Quizzes API] Answer saved, correct: ${isCorrect}`);

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('[Quizzes API] Error:', error);
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

    console.log(`[Quizzes API] Submitting attempt: ${attemptId}`);

    const attemptRepository = AppDataSource.getRepository(QuizAttempt);
    const responseRepository = AppDataSource.getRepository(AnswerResponse);

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
    const percentage = attempt.totalMarks > 0 
      ? (marksObtained / Number(attempt.totalMarks)) * 100 
      : 0;
    const isPassed = percentage >= Number(attempt.quiz?.passingPercentage || 40);

    // Calculate XP earned
    const xpEarned = Math.floor(correctAnswers * 10 + (isPassed ? 50 : 0));

    console.log(`[Quizzes API] Results: correct=${correctAnswers}, wrong=${wrongAnswers}, percentage=${percentage.toFixed(2)}%, passed=${isPassed}, xp=${xpEarned}`);

    await attemptRepository.update(attemptId, {
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      attemptedQuestions: responses.length,
      correctAnswers,
      wrongAnswers,
      marksObtained,
      percentage: Math.round(percentage * 100) / 100,
      timeTakenSeconds: totalTimeTaken,
      isPassed,
      xpEarned,
    });

    // Update daily progress
    await updateDailyProgress(attempt.studentId, 0, 0, 1, xpEarned);

    const updatedAttempt = await attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['responses', 'quiz'],
    });

    console.log(`[Quizzes API] Attempt submitted successfully`);

    res.json({ success: true, data: updatedAttempt });
  } catch (error) {
    console.error('[Quizzes API] Error:', error);
    next(error);
  }
});

export default router;
