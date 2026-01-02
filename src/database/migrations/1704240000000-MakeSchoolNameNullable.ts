import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeSchoolNameNullable1704240000000 implements MigrationInterface {
    name = 'MakeSchoolNameNullable1704240000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make school_name column nullable
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "school_name" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert: Make school_name column required again
        // First, update any NULL values to a default
        await queryRunner.query(`UPDATE "students" SET "school_name" = 'Not Specified' WHERE "school_name" IS NULL`);
        // Then make the column NOT NULL
        await queryRunner.query(`ALTER TABLE "students" ALTER COLUMN "school_name" SET NOT NULL`);
    }
}
