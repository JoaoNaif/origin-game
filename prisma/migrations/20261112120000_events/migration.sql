-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('TOWER', 'CHARACTER_LAUNCH', 'HUNT', 'RESEARCH', 'UNIQUE_BOSS');

-- CreateEnum
CREATE TYPE "EventSquadMode" AS ENUM ('FIXED', 'FREE');

-- AlterEnum
ALTER TYPE "WalletReason" ADD VALUE 'EVENT_REWARD';

-- AlterEnum
ALTER TYPE "ChestSource" ADD VALUE 'EVENT';

-- AlterEnum
ALTER TYPE "GearSource" ADD VALUE 'EVENT';

-- AlterTable
ALTER TABLE "battles" ADD COLUMN     "event_id" TEXT,
ADD COLUMN     "event_outcome" JSONB,
ADD COLUMN     "event_stage" INTEGER;

-- CreateTable
CREATE TABLE "event_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "EventKind" NOT NULL,
    "announce_at" TIMESTAMP(3) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "attempt_limit" JSONB,
    "squad_mode" "EventSquadMode" NOT NULL,
    "field_key" TEXT,
    "modifiers" JSONB NOT NULL DEFAULT '[]',
    "stages" JSONB NOT NULL,
    "completion_rewards" JSONB NOT NULL DEFAULT '[]',
    "participation_rewards" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_entries" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "cleared_stages" INTEGER NOT NULL DEFAULT 0,
    "capture_failures" INTEGER NOT NULL DEFAULT 0,
    "locked_character_ids" JSONB,
    "attempts_day" TEXT,
    "attempts_today" INTEGER NOT NULL DEFAULT 0,
    "attempts_total" INTEGER NOT NULL DEFAULT 0,
    "participated" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_rewards" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "event_id" TEXT,
    "reward" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_templates_key_key" ON "event_templates"("key");

-- CreateIndex
CREATE INDEX "event_templates_ends_at_idx" ON "event_templates"("ends_at");

-- CreateIndex
CREATE INDEX "event_entries_event_id_idx" ON "event_entries"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_entries_account_id_event_id_key" ON "event_entries"("account_id", "event_id");

-- CreateIndex
CREATE INDEX "pending_rewards_account_id_expires_at_idx" ON "pending_rewards"("account_id", "expires_at");

-- CreateIndex
CREATE INDEX "battles_event_id_idx" ON "battles"("event_id");

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_entries" ADD CONSTRAINT "event_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_entries" ADD CONSTRAINT "event_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_rewards" ADD CONSTRAINT "pending_rewards_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

