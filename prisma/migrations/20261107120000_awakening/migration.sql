-- CreateEnum
CREATE TYPE "SkillOfferSource" AS ENUM ('LEVEL_UP', 'AWAKENING');

-- DropIndex
DROP INDEX "skill_offers_character_id_level_key";

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "awakening_drawn_at" TIMESTAMP(3),
ADD COLUMN     "awakening_id" TEXT,
ADD COLUMN     "awakening_missions" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "skill_offers" ADD COLUMN     "source" "SkillOfferSource" NOT NULL DEFAULT 'LEVEL_UP';

-- CreateTable
CREATE TABLE "awakenings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "variant_id" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "missions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "awakenings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "awakenings_key_key" ON "awakenings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "awakenings_variant_id_key" ON "awakenings"("variant_id");

-- CreateIndex
CREATE INDEX "characters_awakening_id_idx" ON "characters"("awakening_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_offers_character_id_level_source_key" ON "skill_offers"("character_id", "level", "source");

-- AddForeignKey
ALTER TABLE "awakenings" ADD CONSTRAINT "awakenings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_awakening_id_fkey" FOREIGN KEY ("awakening_id") REFERENCES "awakenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

