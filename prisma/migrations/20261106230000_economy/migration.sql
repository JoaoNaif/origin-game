-- CreateEnum
CREATE TYPE "WalletReason" AS ENUM ('BATTLE_LOOT', 'CHEST_PURCHASE', 'CHEST_OPEN', 'FRAGMENT_PURCHASE', 'FRAGMENT_SALE', 'SKILL_ENHANCEMENT');

-- CreateEnum
CREATE TYPE "ChestSource" AS ENUM ('PURCHASE', 'BATTLE');

-- AlterTable
ALTER TABLE "character_templates" ADD COLUMN     "is_starter" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "battles" ADD COLUMN     "loot" JSONB;

-- CreateTable
CREATE TABLE "wallets" (
    "account_id" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "fragments" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "wallet_entries" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "reason" "WalletReason" NOT NULL,
    "coins" INTEGER NOT NULL,
    "fragments" JSONB NOT NULL DEFAULT '{}',
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chests" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "tier" "Rarity" NOT NULL,
    "source" "ChestSource" NOT NULL,
    "battle_id" TEXT,
    "contents" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),

    CONSTRAINT "chests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_entries_account_id_created_at_idx" ON "wallet_entries"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "chests_account_id_opened_at_idx" ON "chests"("account_id", "opened_at");

-- CreateIndex
CREATE INDEX "chests_battle_id_idx" ON "chests"("battle_id");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chests" ADD CONSTRAINT "chests_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chests" ADD CONSTRAINT "chests_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Os modelos que já existiam são os iniciais (D133); os criados depois só saem de baú (D150)
UPDATE "character_templates" SET "is_starter" = true;
