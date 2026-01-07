import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAdminsTable1704300000000 implements MigrationInterface {
  name = 'CreateAdminsTable1704300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for admin roles
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE admin_role_enum AS ENUM ('super_admin', 'admin', 'moderator');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create admins table
    await queryRunner.createTable(
      new Table({
        name: 'admins',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'full_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'password',
            type: 'text',
          },
          {
            name: 'role',
            type: 'admin_role_enum',
            default: `'admin'`,
          },
          {
            name: 'permissions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_login_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'profile_image_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refresh_token',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create index on email
    await queryRunner.createIndex(
      'admins',
      new TableIndex({
        name: 'IDX_ADMINS_EMAIL',
        columnNames: ['email'],
        isUnique: true,
      })
    );

    console.log('✅ Admins table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('admins', 'IDX_ADMINS_EMAIL');
    await queryRunner.dropTable('admins');
    await queryRunner.query('DROP TYPE IF EXISTS admin_role_enum');
    console.log('✅ Admins table dropped successfully');
  }
}
