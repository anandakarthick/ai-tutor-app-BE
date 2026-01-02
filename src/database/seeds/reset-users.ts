import 'reflect-metadata';
import AppDataSource from '../../config/datasource';
import { redisClient } from '../../config/redis';
import { logger } from '../../utils/logger';

/**
 * Reset all user data - DELETE ALL USERS AND STUDENTS
 * Run with: npm run reset:users
 * 
 * WARNING: This will permanently delete all user data!
 */

async function resetAllUsers() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    logger.info('⚠️  WARNING: This will DELETE ALL user and student data!');
    logger.info('Starting in 3 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    logger.info('🗑️  Deleting all user-related data...\n');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // Delete in order (respecting foreign key constraints)
    const tables = [
      'chat_messages',
      'learning_sessions', 
      'doubts',
      'quiz_attempts',
      'study_plan_items',
      'study_plans',
      'student_progress',
      'daily_progress',
      'student_achievements',
      'student_interests',
      'notifications',
      'payments',
      'user_subscriptions',
      'otps',
      'students',
      'users',
    ];

    for (const table of tables) {
      try {
        const result = await queryRunner.query(`DELETE FROM "${table}"`);
        logger.info(`   ✓ Cleared ${table}`);
      } catch (err: any) {
        // Table might not exist, skip
        logger.info(`   ⚠ Skipped ${table} (${err.message?.substring(0, 50)})`);
      }
    }

    await queryRunner.release();

    // Clear Redis cache
    if (redisClient) {
      logger.info('\n🧹 Clearing Redis cache...');
      await redisClient.flushdb();
      logger.info('   Redis cache cleared');
    }

    logger.info('\n✅ All user data has been deleted!');
    logger.info('\n📱 Next steps:');
    logger.info('   1. Restart your backend: npm run dev');
    logger.info('   2. Clear app data on phone (Settings → Apps → AI Tutor → Clear Data)');
    logger.info('   3. Open app and register as a new user');
    logger.info('   4. You should now see subjects after registration!\n');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

resetAllUsers();
