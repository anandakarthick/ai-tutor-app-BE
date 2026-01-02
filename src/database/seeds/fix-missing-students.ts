import 'reflect-metadata';
import AppDataSource from '../../config/datasource';
import { User } from '../../entities/User';
import { Student } from '../../entities/Student';
import { Board } from '../../entities/Board';
import { Class } from '../../entities/Class';
import { Medium } from '../../entities/enums';
import { redisClient } from '../../config/redis';
import { logger } from '../../utils/logger';

/**
 * Fix existing users without student profiles
 * Run with: npm run fix:students
 */

async function fixMissingStudents() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    logger.info('🔧 Starting fix for users without student profiles...');

    const userRepo = AppDataSource.getRepository(User);
    const studentRepo = AppDataSource.getRepository(Student);
    const boardRepo = AppDataSource.getRepository(Board);
    const classRepo = AppDataSource.getRepository(Class);

    // Get Maharashtra Board
    const mhBoard = await boardRepo.findOne({ where: { name: 'STATE_MH' } });
    if (!mhBoard) {
      logger.error('❌ Maharashtra Board not found. Run seed first.');
      process.exit(1);
    }

    // Get Class 8 (you can change this)
    const class8 = await classRepo.findOne({ 
      where: { boardId: mhBoard.id, className: '8' }
    });
    if (!class8) {
      logger.error('❌ Class 8 not found. Run seed first.');
      process.exit(1);
    }

    logger.info(`Using Board: ${mhBoard.fullName}`);
    logger.info(`Using Class: ${class8.displayName || class8.className}`);

    // Find all users
    const users = await userRepo.find({ where: { isActive: true } });
    logger.info(`\nFound ${users.length} active users`);

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if user already has a student profile
      const existingStudent = await studentRepo.findOne({
        where: { userId: user.id }
      });

      if (existingStudent) {
        // Update existing student if missing classId
        if (!existingStudent.classId || !existingStudent.boardId) {
          existingStudent.boardId = mhBoard.id;
          existingStudent.classId = class8.id;
          existingStudent.medium = Medium.ENGLISH;
          await studentRepo.save(existingStudent);
          logger.info(`🔄 Updated student profile for: ${user.fullName}`);
          created++;
        } else {
          logger.info(`⏭️ User ${user.fullName} already has complete student profile`);
          skipped++;
        }
        continue;
      }

      // Create student profile
      const student = studentRepo.create({
        userId: user.id,
        studentName: user.fullName,
        boardId: mhBoard.id,
        classId: class8.id,
        medium: Medium.ENGLISH,
        academicYear: '2024',
        dailyStudyHours: 2,
      });

      await studentRepo.save(student);
      logger.info(`✅ Created student profile for: ${user.fullName}`);
      created++;
    }

    // Clear subject cache so new data is fetched
    if (redisClient) {
      logger.info('\n🧹 Clearing subject cache...');
      const keys = await redisClient.keys('subjects:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info(`Cleared ${keys.length} cached subject entries`);
      }
    }

    logger.info('\n🎉 Fix completed!');
    logger.info(`Created/Updated: ${created} student profiles`);
    logger.info(`Skipped: ${skipped} (already complete)`);
    logger.info('\n👉 Now restart your backend server and refresh the app!');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixMissingStudents();
