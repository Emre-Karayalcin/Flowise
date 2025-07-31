import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCreditsToUser1746869999999 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "credits" integer NOT NULL DEFAULT 0;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "credits";`)
    }
}