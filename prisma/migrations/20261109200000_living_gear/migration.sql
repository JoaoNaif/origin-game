-- CreateEnum
CREATE TYPE "GearGrade" AS ENUM ('SQUIRE', 'KNIGHT', 'MASTER', 'KING', 'DIVINE');

-- CreateEnum
CREATE TYPE "GearKind" AS ENUM ('WEAPON', 'ARMOR');

-- CreateEnum
CREATE TYPE "GearSource" AS ENUM ('CHEST', 'ADMIN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletReason" ADD VALUE 'INVENTORY_EXPANSION';
ALTER TYPE "WalletReason" ADD VALUE 'GEAR_SALE';

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "inventory_slots" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "gear_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "GearKind" NOT NULL,
    "grade" "GearGrade" NOT NULL,
    "lineage" "Lineage" NOT NULL,
    "primary_stat" "Stat" NOT NULL,
    "secondary_stat" "Stat" NOT NULL,
    "primary_percent" DOUBLE PRECISION NOT NULL,
    "secondary_percent" DOUBLE PRECISION NOT NULL,
    "requirements" JSONB NOT NULL,
    "titles" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gear_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "character_id" TEXT,
    "source" "GearSource" NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gear_templates_key_key" ON "gear_templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "gear_character_id_key" ON "gear"("character_id");

-- CreateIndex
CREATE INDEX "gear_account_id_idx" ON "gear"("account_id");

-- CreateIndex
CREATE INDEX "gear_template_id_idx" ON "gear"("template_id");

-- AddForeignKey
ALTER TABLE "gear" ADD CONSTRAINT "gear_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear" ADD CONSTRAINT "gear_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "gear_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear" ADD CONSTRAINT "gear_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

