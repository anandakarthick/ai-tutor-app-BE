import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBoardsTable1704700000000 implements MigrationInterface {
  name = 'CreateBoardsTable1704700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create boards table
    await queryRunner.createTable(
      new Table({
        name: 'boards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'full_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'logo_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'display_order',
            type: 'int',
            default: 0,
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create index on name
    await queryRunner.createIndex(
      'boards',
      new TableIndex({
        name: 'IDX_BOARDS_NAME',
        columnNames: ['name'],
      })
    );

    // Create index on is_active
    await queryRunner.createIndex(
      'boards',
      new TableIndex({
        name: 'IDX_BOARDS_IS_ACTIVE',
        columnNames: ['is_active'],
      })
    );

    // Insert default boards
    await queryRunner.query(`
      INSERT INTO boards (id, name, full_name, state, description, display_order) VALUES
      (uuid_generate_v4(), 'CBSE', 'Central Board of Secondary Education', NULL, 'National level board of education in India for public and private schools, controlled by the Government of India.', 1),
      (uuid_generate_v4(), 'ICSE', 'Indian Certificate of Secondary Education', NULL, 'Private board of secondary education in India conducted by the Council for the Indian School Certificate Examinations.', 2),
      (uuid_generate_v4(), 'STATE', 'State Board', NULL, 'State-level boards of education that follow curriculum set by respective state governments.', 3),
      (uuid_generate_v4(), 'IB', 'International Baccalaureate', NULL, 'International educational foundation offering four educational programmes for children aged 3-19.', 4),
      (uuid_generate_v4(), 'CAMBRIDGE', 'Cambridge International', NULL, 'International education programme and qualification for 5 to 19 year olds.', 5)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('boards', 'IDX_BOARDS_IS_ACTIVE');
    await queryRunner.dropIndex('boards', 'IDX_BOARDS_NAME');
    await queryRunner.dropTable('boards');
  }
}
