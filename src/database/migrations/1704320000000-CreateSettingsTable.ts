import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSettingsTable1704320000000 implements MigrationInterface {
  name = 'CreateSettingsTable1704320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create settings table
    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          {
            name: 'key',
            type: 'varchar',
            length: '100',
            isPrimary: true,
          },
          {
            name: 'value',
            type: 'text',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            default: "'string'",
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Insert default settings
    await queryRunner.query(`
      INSERT INTO settings (key, value, category, description, type) VALUES
      -- General Settings
      ('site_name', 'AI Tutor', 'general', 'Platform name', 'string'),
      ('site_description', 'Your AI-powered learning companion', 'general', 'Platform description', 'string'),
      ('site_url', 'https://aitutor.com', 'general', 'Website URL', 'string'),
      ('support_email', 'support@aitutor.com', 'general', 'Support email address', 'string'),
      ('support_phone', '+91 1800-123-4567', 'general', 'Support phone number', 'string'),
      ('timezone', 'Asia/Kolkata', 'general', 'Default timezone', 'string'),
      ('language', 'en', 'general', 'Default language', 'string'),
      ('maintenance_mode', 'false', 'general', 'Enable maintenance mode', 'boolean'),
      
      -- Payment Settings
      ('razorpay_enabled', 'true', 'payment', 'Enable Razorpay gateway', 'boolean'),
      ('razorpay_key_id', '', 'payment', 'Razorpay Key ID', 'string'),
      ('razorpay_test_mode', 'true', 'payment', 'Use test mode', 'boolean'),
      
      -- App Settings
      ('app_current_version', '1.0.0', 'app', 'Current app version', 'string'),
      ('app_min_version', '1.0.0', 'app', 'Minimum required version', 'string'),
      ('app_force_update', 'false', 'app', 'Force update required', 'boolean'),
      ('play_store_url', '', 'app', 'Play Store URL', 'string'),
      ('app_store_url', '', 'app', 'App Store URL', 'string'),
      ('max_login_devices', '3', 'app', 'Max devices per user', 'number'),
      ('session_timeout', '30', 'app', 'Session timeout in minutes', 'number'),
      ('free_trial_days', '7', 'app', 'Free trial period', 'number'),
      ('max_questions_per_day', '50', 'app', 'Max free questions per day', 'number'),
      ('offline_mode', 'true', 'app', 'Enable offline mode', 'boolean'),
      ('push_notifications', 'true', 'app', 'Enable push notifications', 'boolean'),
      ('analytics_enabled', 'true', 'app', 'Enable analytics', 'boolean'),
      
      -- Notification Settings
      ('email_notifications', 'true', 'notifications', 'Enable email notifications', 'boolean'),
      ('sms_notifications', 'false', 'notifications', 'Enable SMS notifications', 'boolean'),
      ('new_user_notification', 'true', 'notifications', 'Notify on new user', 'boolean'),
      ('payment_notification', 'true', 'notifications', 'Notify on payment', 'boolean'),
      ('daily_report_email', 'false', 'notifications', 'Send daily report', 'boolean'),
      ('weekly_report_email', 'true', 'notifications', 'Send weekly report', 'boolean'),
      ('report_recipients', 'admin@aitutor.com', 'notifications', 'Report recipients', 'string'),
      
      -- Security Settings
      ('two_factor_auth', 'false', 'security', 'Require 2FA for admin', 'boolean'),
      ('ip_whitelisting', 'false', 'security', 'Enable IP whitelisting', 'boolean'),
      ('session_logging', 'true', 'security', 'Log admin sessions', 'boolean'),
      ('password_policy', 'medium', 'security', 'Password policy level', 'string'),
      ('auto_logout_minutes', '30', 'security', 'Auto logout timeout', 'number'),
      
      -- Email Settings
      ('smtp_host', '', 'email', 'SMTP host', 'string'),
      ('smtp_port', '587', 'email', 'SMTP port', 'number'),
      ('smtp_username', '', 'email', 'SMTP username', 'string'),
      ('smtp_from_email', '', 'email', 'From email address', 'string'),
      ('smtp_from_name', 'AI Tutor', 'email', 'From name', 'string'),
      ('smtp_use_tls', 'true', 'email', 'Use TLS encryption', 'boolean'),
      
      -- Backup Settings
      ('auto_backup', 'true', 'database', 'Enable auto backup', 'boolean'),
      ('backup_time', '02:00', 'database', 'Backup time', 'string'),
      ('backup_retention_days', '30', 'database', 'Backup retention days', 'number'),
      ('backup_storage', 'local', 'database', 'Backup storage type', 'string')
      ON CONFLICT (key) DO NOTHING;
    `);

    console.log('✅ Settings table created with default values');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('settings');
    console.log('✅ Settings table dropped');
  }
}
