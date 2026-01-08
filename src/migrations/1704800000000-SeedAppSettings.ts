import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed App Configuration Settings
 * Adds maintenance mode and force update settings to the database
 */
export class SeedAppSettings1704800000000 implements MigrationInterface {
  name = 'SeedAppSettings1704800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert app settings if they don't exist
    const appSettings = [
      // App Version Settings
      {
        key: 'app_current_version',
        value: '1.0.0',
        category: 'app',
        description: 'Current app version',
        type: 'string',
      },
      {
        key: 'app_min_version',
        value: '1.0.0',
        category: 'app',
        description: 'Minimum required app version',
        type: 'string',
      },
      {
        key: 'app_force_update',
        value: 'false',
        category: 'app',
        description: 'Force users to update to minimum version',
        type: 'boolean',
      },
      {
        key: 'app_update_message',
        value: 'A new version is available. Please update to continue using the app.',
        category: 'app',
        description: 'Message shown when force update is required',
        type: 'string',
      },
      {
        key: 'play_store_url',
        value: '',
        category: 'app',
        description: 'Google Play Store URL',
        type: 'string',
      },
      {
        key: 'app_store_url',
        value: '',
        category: 'app',
        description: 'Apple App Store URL',
        type: 'string',
      },
      // Maintenance Mode Settings
      {
        key: 'maintenance_mode',
        value: 'false',
        category: 'general',
        description: 'Enable maintenance mode',
        type: 'boolean',
      },
      {
        key: 'maintenance_message',
        value: 'We are currently under maintenance. Please check back soon.',
        category: 'general',
        description: 'Message shown during maintenance',
        type: 'string',
      },
      // Other App Settings
      {
        key: 'max_login_devices',
        value: '3',
        category: 'app',
        description: 'Maximum devices a user can login from',
        type: 'number',
      },
      {
        key: 'session_timeout',
        value: '30',
        category: 'app',
        description: 'Session timeout in minutes',
        type: 'number',
      },
      {
        key: 'free_trial_days',
        value: '7',
        category: 'app',
        description: 'Number of free trial days',
        type: 'number',
      },
      {
        key: 'max_questions_per_day',
        value: '50',
        category: 'app',
        description: 'Maximum questions per day for free users',
        type: 'number',
      },
      {
        key: 'offline_mode',
        value: 'true',
        category: 'app',
        description: 'Allow offline access',
        type: 'boolean',
      },
      {
        key: 'push_notifications',
        value: 'true',
        category: 'app',
        description: 'Enable push notifications',
        type: 'boolean',
      },
      {
        key: 'analytics_enabled',
        value: 'true',
        category: 'app',
        description: 'Enable analytics tracking',
        type: 'boolean',
      },
    ];

    for (const setting of appSettings) {
      // Check if setting exists
      const existing = await queryRunner.query(
        `SELECT * FROM settings WHERE \`key\` = ?`,
        [setting.key]
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO settings (\`key\`, value, category, description, type, updated_at) VALUES (?, ?, ?, ?, ?, NOW())`,
          [setting.key, setting.value, setting.category, setting.description, setting.type]
        );
      }
    }

    console.log('✅ App settings seeded successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const keys = [
      'app_current_version',
      'app_min_version',
      'app_force_update',
      'app_update_message',
      'play_store_url',
      'app_store_url',
      'maintenance_mode',
      'maintenance_message',
      'max_login_devices',
      'session_timeout',
      'free_trial_days',
      'max_questions_per_day',
      'offline_mode',
      'push_notifications',
      'analytics_enabled',
    ];

    for (const key of keys) {
      await queryRunner.query(`DELETE FROM settings WHERE \`key\` = ?`, [key]);
    }

    console.log('✅ App settings removed');
  }
}
