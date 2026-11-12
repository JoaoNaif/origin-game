-- CreateEnum
CREATE TYPE "BeastContract" AS ENUM ('DOMINANCE', 'MASTER', 'EQUALITY');

-- CreateEnum
CREATE TYPE "BeastGrade" AS ENUM ('SQUIRE', 'KNIGHT', 'MASTER', 'KING', 'SACRED');

-- CreateEnum
CREATE TYPE "BeastSource" AS ENUM ('ADMIN', 'EVENT');

-- AlterEnum
ALTER TYPE "WalletReason" ADD VALUE 'BEAST_SALE';

-- CreateTable
CREATE TABLE "beast_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contract" "BeastContract" NOT NULL,
    "grade" "BeastGrade" NOT NULL,
    "lineage" "Lineage" NOT NULL,
    "skills" JSONB NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "titles" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beast_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beasts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "character_id" TEXT,
    "slot" INTEGER,
    "source" "BeastSource" NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beast_templates_key_key" ON "beast_templates"("key");

-- CreateIndex
CREATE INDEX "beasts_account_id_idx" ON "beasts"("account_id");

-- CreateIndex
CREATE INDEX "beasts_template_id_idx" ON "beasts"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "beasts_character_id_slot_key" ON "beasts"("character_id", "slot");

-- AddForeignKey
ALTER TABLE "beasts" ADD CONSTRAINT "beasts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beasts" ADD CONSTRAINT "beasts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "beast_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beasts" ADD CONSTRAINT "beasts_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

