-- CreateTable
CREATE TABLE "skill_offers" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "skill_ids" TEXT[],
    "chosen_skill_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chosen_at" TIMESTAMP(3),

    CONSTRAINT "skill_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_offers_character_id_level_key" ON "skill_offers"("character_id", "level");

-- AddForeignKey
ALTER TABLE "skill_offers" ADD CONSTRAINT "skill_offers_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
