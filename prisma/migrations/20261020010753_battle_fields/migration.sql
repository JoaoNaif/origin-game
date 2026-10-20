-- CreateEnum
CREATE TYPE "Stat" AS ENUM ('HP', 'ATTACK', 'DEFENSE', 'SPEED', 'PRECISION', 'EVASION', 'WILL');

-- CreateTable
CREATE TABLE "battle_fields" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "primary_stat" "Stat" NOT NULL,
    "secondary_stat" "Stat" NOT NULL,
    "primary_percent" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "secondary_percent" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battle_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_field_traits" (
    "field_id" TEXT NOT NULL,
    "trait_id" TEXT NOT NULL,

    CONSTRAINT "battle_field_traits_pkey" PRIMARY KEY ("field_id","trait_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "battle_fields_key_key" ON "battle_fields"("key");

-- CreateIndex
CREATE INDEX "battle_field_traits_trait_id_idx" ON "battle_field_traits"("trait_id");

-- AddForeignKey
ALTER TABLE "battle_field_traits" ADD CONSTRAINT "battle_field_traits_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "battle_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_field_traits" ADD CONSTRAINT "battle_field_traits_trait_id_fkey" FOREIGN KEY ("trait_id") REFERENCES "traits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
