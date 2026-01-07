import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSchoolsTable1704310000000 implements MigrationInterface {
  name = 'CreateSchoolsTable1704310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schools table
    await queryRunner.createTable(
      new Table({
        name: 'schools',
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
            name: 'school_name',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'pincode',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'principal_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'contact_person',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'contact_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'contact_phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'logo_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'board_affiliation',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'affiliation_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'student_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'active_subscriptions',
            type: 'integer',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_partner',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create index on school_name
    await queryRunner.createIndex(
      'schools',
      new TableIndex({
        name: 'IDX_SCHOOLS_NAME',
        columnNames: ['school_name'],
        isUnique: true,
      })
    );

    // Create index on city
    await queryRunner.createIndex(
      'schools',
      new TableIndex({
        name: 'IDX_SCHOOLS_CITY',
        columnNames: ['city'],
      })
    );

    console.log('✅ Schools table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('schools', 'IDX_SCHOOLS_CITY');
    await queryRunner.dropIndex('schools', 'IDX_SCHOOLS_NAME');
    await queryRunner.dropTable('schools');
    console.log('✅ Schools table dropped successfully');
  }
}
