import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationPreferences1704153600000 implements MigrationInterface {
  name = 'AddNotificationPreferences1704153600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add notification_preferences column to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "notification_preferences" jsonb 
      DEFAULT '{"masterEnabled":true,"studyReminders":true,"quizAlerts":true,"achievements":true,"newContent":true,"tips":false,"promotions":false}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "notification_preferences"
    `);
  }
}
