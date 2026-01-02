import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActiveSessionToUser1704250000000 implements MigrationInterface {
    name = 'AddActiveSessionToUser1704250000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add active_session_id column for single device login
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_session_id" VARCHAR(255)`);
        
        // Add active_device_info column to store device information
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_device_info" TEXT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "active_device_info"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "active_session_id"`);
    }
}
