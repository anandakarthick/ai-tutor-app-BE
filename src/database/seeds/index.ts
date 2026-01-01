import 'reflect-metadata';
import { AppDataSource, initializeDatabase } from '../../config/database';
import { Board } from '../../entities/Board';
import { Class } from '../../entities/Class';
import { SubscriptionPlan } from '../../entities/SubscriptionPlan';
import { Achievement, AchievementCategory } from '../../entities/Achievement';
import { logger } from '../../utils/logger';

async function seed() {
  try {
    await initializeDatabase();
    logger.info('🌱 Starting database seeding...');

    // Seed Boards
    const boardRepository = AppDataSource.getRepository(Board);
    const boards = [
      { name: 'CBSE', fullName: 'Central Board of Secondary Education', state: 'National', displayOrder: 1 },
      { name: 'ICSE', fullName: 'Indian Certificate of Secondary Education', state: 'National', displayOrder: 2 },
      { name: 'STATE_TN', fullName: 'Tamil Nadu State Board', state: 'Tamil Nadu', displayOrder: 3 },
      { name: 'STATE_KA', fullName: 'Karnataka State Board', state: 'Karnataka', displayOrder: 4 },
      { name: 'STATE_MH', fullName: 'Maharashtra State Board', state: 'Maharashtra', displayOrder: 5 },
      { name: 'IB', fullName: 'International Baccalaureate', state: 'International', displayOrder: 6 },
      { name: 'CAMBRIDGE', fullName: 'Cambridge International', state: 'International', displayOrder: 7 },
    ];

    const savedBoards: Board[] = [];
    for (const boardData of boards) {
      let board = await boardRepository.findOne({ where: { name: boardData.name } });
      if (!board) {
        board = boardRepository.create(boardData);
        await boardRepository.save(board);
      }
      savedBoards.push(board);
    }
    logger.info(`✅ Seeded ${boards.length} boards`);

    // Seed Classes for each board
    const classRepository = AppDataSource.getRepository(Class);
    const classNames = [
      { name: '6', display: 'Class 6', order: 1 },
      { name: '7', display: 'Class 7', order: 2 },
      { name: '8', display: 'Class 8', order: 3 },
      { name: '9', display: 'Class 9', order: 4 },
      { name: '10', display: 'Class 10', order: 5 },
      { name: '11', display: 'Class 11', order: 6 },
      { name: '12', display: 'Class 12', order: 7 },
    ];

    let classCount = 0;
    for (const board of savedBoards) {
      for (const cls of classNames) {
        const existing = await classRepository.findOne({
          where: { boardId: board.id, className: cls.name },
        });
        if (!existing) {
          const classEntity = classRepository.create({
            boardId: board.id,
            className: cls.name,
            displayName: cls.display,
            displayOrder: cls.order,
          });
          await classRepository.save(classEntity);
          classCount++;
        }
      }
    }
    logger.info(`✅ Seeded ${classCount} classes`);

    // Seed Subscription Plans
    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const plans = [
      {
        planName: 'basic',
        displayName: 'Basic Plan',
        description: 'Perfect for getting started',
        price: 499,
        originalPrice: 699,
        durationMonths: 1,
        maxStudents: 1,
        aiMinutesPerDay: 30,
        features: ['1 Subject', '30 AI mins/day', 'Basic quizzes', 'Weekly reports', 'Email support'],
        doubtTypes: ['text'],
        supportType: 'email',
        reportFrequency: 'weekly',
        displayOrder: 1,
      },
      {
        planName: 'standard',
        displayName: 'Standard Plan',
        description: 'Most popular choice',
        price: 999,
        originalPrice: 1499,
        durationMonths: 1,
        maxStudents: 1,
        aiMinutesPerDay: 60,
        features: ['3 Subjects', '60 AI mins/day', 'All quizzes', 'Daily reports', 'Chat support'],
        doubtTypes: ['text', 'voice'],
        supportType: 'chat',
        reportFrequency: 'daily',
        isPopular: true,
        displayOrder: 2,
      },
      {
        planName: 'premium',
        displayName: 'Premium Plan',
        description: 'Complete learning experience',
        price: 1499,
        originalPrice: 2499,
        durationMonths: 1,
        maxStudents: 2,
        aiMinutesPerDay: 120,
        features: ['All Subjects', '120 AI mins/day', 'All quizzes + Mock tests', 'Real-time reports', 'Priority support'],
        doubtTypes: ['text', 'voice', 'image'],
        supportType: 'priority_chat',
        reportFrequency: 'realtime',
        displayOrder: 3,
      },
      {
        planName: 'unlimited',
        displayName: 'Unlimited Plan',
        description: 'For serious learners',
        price: 2499,
        originalPrice: 3999,
        durationMonths: 1,
        maxStudents: 3,
        aiMinutesPerDay: 9999, // Unlimited
        features: ['All Subjects', 'Unlimited AI', 'All features', 'Live sessions', 'Personal mentor', '24/7 support'],
        doubtTypes: ['text', 'voice', 'image'],
        hasLiveSessions: true,
        hasPersonalMentor: true,
        supportType: '24x7',
        reportFrequency: 'realtime',
        displayOrder: 4,
      },
    ];

    let planCount = 0;
    for (const planData of plans) {
      const existing = await planRepository.findOne({ where: { planName: planData.planName } });
      if (!existing) {
        const plan = planRepository.create(planData);
        await planRepository.save(plan);
        planCount++;
      }
    }
    logger.info(`✅ Seeded ${planCount} subscription plans`);

    // Seed Achievements
    const achievementRepository = AppDataSource.getRepository(Achievement);
    const achievements = [
      // Streak achievements
      { achievementName: 'first_day', displayName: 'First Step', description: 'Complete your first day of learning', category: AchievementCategory.STREAK, xpReward: 10, tier: 1 },
      { achievementName: 'week_streak', displayName: 'Week Warrior', description: 'Maintain a 7-day streak', category: AchievementCategory.STREAK, xpReward: 50, tier: 2 },
      { achievementName: 'month_streak', displayName: 'Monthly Master', description: 'Maintain a 30-day streak', category: AchievementCategory.STREAK, xpReward: 200, tier: 3 },
      { achievementName: 'century_streak', displayName: 'Century Centurion', description: 'Maintain a 100-day streak', category: AchievementCategory.STREAK, xpReward: 1000, tier: 4 },
      
      // Learning achievements
      { achievementName: 'first_topic', displayName: 'Topic Explorer', description: 'Complete your first topic', category: AchievementCategory.LEARNING, xpReward: 15, tier: 1 },
      { achievementName: 'chapter_complete', displayName: 'Chapter Champion', description: 'Complete an entire chapter', category: AchievementCategory.LEARNING, xpReward: 100, tier: 2 },
      { achievementName: 'subject_master', displayName: 'Subject Master', description: 'Complete all topics in a subject', category: AchievementCategory.LEARNING, xpReward: 500, tier: 3 },
      { achievementName: 'bookworm', displayName: 'Bookworm', description: 'Study for 100 hours total', category: AchievementCategory.LEARNING, xpReward: 300, tier: 3 },
      
      // Quiz achievements
      { achievementName: 'first_quiz', displayName: 'Quiz Beginner', description: 'Complete your first quiz', category: AchievementCategory.QUIZ, xpReward: 10, tier: 1 },
      { achievementName: 'perfect_score', displayName: 'Perfect Score', description: 'Score 100% on any quiz', category: AchievementCategory.QUIZ, xpReward: 50, tier: 2 },
      { achievementName: 'quiz_master', displayName: 'Quiz Master', description: 'Complete 50 quizzes', category: AchievementCategory.QUIZ, xpReward: 200, tier: 3 },
      { achievementName: 'accuracy_king', displayName: 'Accuracy King', description: 'Maintain 90%+ accuracy across 20 quizzes', category: AchievementCategory.QUIZ, xpReward: 300, tier: 3 },
      
      // Doubt achievements
      { achievementName: 'curious_mind', displayName: 'Curious Mind', description: 'Ask your first doubt', category: AchievementCategory.DOUBT, xpReward: 10, tier: 1 },
      { achievementName: 'question_seeker', displayName: 'Question Seeker', description: 'Ask 50 doubts', category: AchievementCategory.DOUBT, xpReward: 100, tier: 2 },
      
      // XP achievements
      { achievementName: 'xp_100', displayName: 'Rising Star', description: 'Earn 100 XP', category: AchievementCategory.XP, xpReward: 25, tier: 1 },
      { achievementName: 'xp_1000', displayName: 'XP Hunter', description: 'Earn 1000 XP', category: AchievementCategory.XP, xpReward: 100, tier: 2 },
      { achievementName: 'xp_10000', displayName: 'XP Legend', description: 'Earn 10000 XP', category: AchievementCategory.XP, xpReward: 500, tier: 3 },
      
      // Level achievements
      { achievementName: 'level_5', displayName: 'Level 5 Learner', description: 'Reach level 5', category: AchievementCategory.LEVEL, xpReward: 50, tier: 1 },
      { achievementName: 'level_10', displayName: 'Level 10 Scholar', description: 'Reach level 10', category: AchievementCategory.LEVEL, xpReward: 150, tier: 2 },
      { achievementName: 'level_25', displayName: 'Level 25 Expert', description: 'Reach level 25', category: AchievementCategory.LEVEL, xpReward: 500, tier: 3 },
      
      // Special achievements
      { achievementName: 'early_bird', displayName: 'Early Bird', description: 'Study before 7 AM', category: AchievementCategory.SPECIAL, xpReward: 25, tier: 1 },
      { achievementName: 'night_owl', displayName: 'Night Owl', description: 'Study after 10 PM', category: AchievementCategory.SPECIAL, xpReward: 25, tier: 1 },
      { achievementName: 'weekend_warrior', displayName: 'Weekend Warrior', description: 'Study on both Saturday and Sunday', category: AchievementCategory.SPECIAL, xpReward: 30, tier: 1 },
    ];

    let achievementCount = 0;
    for (let i = 0; i < achievements.length; i++) {
      const data = achievements[i];
      const existing = await achievementRepository.findOne({ where: { achievementName: data.achievementName } });
      if (!existing) {
        const achievement = achievementRepository.create({
          ...data,
          displayOrder: i + 1,
        });
        await achievementRepository.save(achievement);
        achievementCount++;
      }
    }
    logger.info(`✅ Seeded ${achievementCount} achievements`);

    logger.info('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
