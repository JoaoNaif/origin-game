-- CreateEnum
CREATE TYPE "Lineage" AS ENUM ('FUNDAMENTAL', 'ELEMENTAL', 'MATERIAL', 'VECTORIAL', 'PSYCHIC', 'BIOLOGICAL', 'NONE');

-- CreateEnum
CREATE TYPE "TraitCategory" AS ENUM ('COMBAT', 'POSTURE', 'ORIGIN');

-- CreateEnum
CREATE TYPE "TraitSource" AS ENUM ('TEMPLATE', 'CONQUERED');

-- CreateEnum
CREATE TYPE "CharacterClass" AS ENUM ('VANGUARD', 'MARKSMAN', 'EXECUTOR', 'CONTROLLER', 'SUPPORT', 'ARTILLERY', 'GUARDIAN', 'TACTICIAN');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('E', 'D', 'C', 'B', 'A', 'S', 'SS');

-- CreateEnum
CREATE TYPE "DangerLevel" AS ENUM ('DISCRETE', 'CONTINUOUS', 'DIFFERENTIABLE', 'NON_LINEAR', 'CHAOTIC');

-- CreateEnum
CREATE TYPE "Exclusivity" AS ENUM ('NONE', 'EVENT', 'RANKING');

-- CreateEnum
CREATE TYPE "SkillTier" AS ENUM ('BASIC', 'STANDARD', 'REINFORCED', 'STRONG', 'FINAL');

-- CreateEnum
CREATE TYPE "SkillTarget" AS ENUM ('ENEMY', 'ALLY', 'SELF');

-- CreateEnum
CREATE TYPE "SkillRange" AS ENUM ('MELEE', 'RANGED', 'PIERCING', 'FLANK');

-- CreateEnum
CREATE TYPE "SkillArea" AS ENUM ('SINGLE', 'LINE', 'COLUMN', 'GRID');

-- CreateEnum
CREATE TYPE "SkillKitSlot" AS ENUM ('BASIC', 'STANDARD', 'ROLE', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "CharacterSkillSource" AS ENUM ('KIT', 'OFFER');

-- CreateEnum
CREATE TYPE "AiProfile" AS ENUM ('AGGRESSIVE', 'CAUTIOUS', 'FINISHER', 'BALANCED');

-- CreateEnum
CREATE TYPE "AiDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER', 'GRANDMASTER');

-- CreateEnum
CREATE TYPE "BattleMode" AS ENUM ('PVE', 'CASUAL', 'RANKED', 'FRIENDLY');

-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "BattleSide" AS ENUM ('PLAYER', 'OPPONENT');

-- CreateEnum
CREATE TYPE "BattleEndReason" AS ENUM ('ELIMINATION', 'ROUND_LIMIT', 'ABANDON');

-- CreateEnum
CREATE TYPE "BattleActionType" AS ENUM ('SKILL', 'MOVE', 'SWAP', 'DEFEND');

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lineage" "Lineage" NOT NULL,
    "description" TEXT,
    "awakens_from_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TraitCategory" NOT NULL,
    "source" "TraitSource" NOT NULL,
    "variant_id" TEXT,
    "effects" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "character_class" "CharacterClass" NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "initial_danger" "DangerLevel" NOT NULL,
    "exclusivity" "Exclusivity" NOT NULL DEFAULT 'NONE',
    "family_trait_id" TEXT,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "precision" INTEGER NOT NULL,
    "evasion" INTEGER NOT NULL,
    "will" INTEGER NOT NULL,
    "passive" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_template_variants" (
    "template_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "character_template_variants_pkey" PRIMARY KEY ("template_id","variant_id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "variant_id" TEXT,
    "tier" "SkillTier" NOT NULL,
    "target" "SkillTarget" NOT NULL,
    "range" "SkillRange",
    "area" "SkillArea" NOT NULL,
    "cooldown" INTEGER NOT NULL,
    "desgaste_percent" DOUBLE PRECISION NOT NULL,
    "base_hit_chance" DOUBLE PRECISION,
    "min_level" INTEGER NOT NULL,
    "kit_class" "CharacterClass",
    "kit_slot" "SkillKitSlot",
    "effects" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "danger" "DangerLevel" NOT NULL,
    "danger_points" INTEGER NOT NULL DEFAULT 0,
    "awakened_variant_id" TEXT,
    "free_hp" INTEGER NOT NULL DEFAULT 0,
    "free_attack" INTEGER NOT NULL DEFAULT 0,
    "free_defense" INTEGER NOT NULL DEFAULT 0,
    "free_speed" INTEGER NOT NULL DEFAULT 0,
    "free_precision" INTEGER NOT NULL DEFAULT 0,
    "free_evasion" INTEGER NOT NULL DEFAULT 0,
    "free_will" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_traits" (
    "character_id" TEXT NOT NULL,
    "trait_id" TEXT NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_traits_pkey" PRIMARY KEY ("character_id","trait_id")
);

-- CreateTable
CREATE TABLE "character_skills" (
    "character_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "source" "CharacterSkillSource" NOT NULL,
    "is_enhanced" BOOLEAN NOT NULL DEFAULT false,
    "build_slot" INTEGER,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_skills_pkey" PRIMARY KEY ("character_id","skill_id")
);

-- CreateTable
CREATE TABLE "squads" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "squads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squad_members" (
    "squad_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,

    CONSTRAINT "squad_members_pkey" PRIMARY KEY ("squad_id","character_id")
);

-- CreateTable
CREATE TABLE "npc_squads" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "profile" "AiProfile" NOT NULL,
    "difficulty" "AiDifficulty" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "npc_squads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc_squad_members" (
    "id" TEXT NOT NULL,
    "npc_squad_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,
    "awakened_variant_id" TEXT,

    CONSTRAINT "npc_squad_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc_squad_member_skills" (
    "member_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "build_slot" INTEGER NOT NULL,

    CONSTRAINT "npc_squad_member_skills_pkey" PRIMARY KEY ("member_id","skill_id")
);

-- CreateTable
CREATE TABLE "npc_squad_member_traits" (
    "member_id" TEXT NOT NULL,
    "trait_id" TEXT NOT NULL,

    CONSTRAINT "npc_squad_member_traits_pkey" PRIMARY KEY ("member_id","trait_id")
);

-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "mode" "BattleMode" NOT NULL,
    "status" "BattleStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "squad_id" TEXT,
    "npc_squad_id" TEXT,
    "ai_profile" "AiProfile",
    "ai_difficulty" "AiDifficulty",
    "seed" INTEGER NOT NULL,
    "engine_version" TEXT NOT NULL,
    "content_version" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "winner" "BattleSide",
    "end_reason" "BattleEndReason",
    "rounds" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_actions" (
    "battle_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "side" "BattleSide" NOT NULL,
    "actor_ref" TEXT NOT NULL,
    "type" "BattleActionType" NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_actions_pkey" PRIMARY KEY ("battle_id","sequence")
);

-- CreateIndex
CREATE UNIQUE INDEX "variants_key_key" ON "variants"("key");

-- CreateIndex
CREATE INDEX "variants_awakens_from_id_idx" ON "variants"("awakens_from_id");

-- CreateIndex
CREATE UNIQUE INDEX "traits_key_key" ON "traits"("key");

-- CreateIndex
CREATE INDEX "traits_variant_id_idx" ON "traits"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_templates_key_key" ON "character_templates"("key");

-- CreateIndex
CREATE INDEX "character_templates_family_trait_id_idx" ON "character_templates"("family_trait_id");

-- CreateIndex
CREATE INDEX "character_templates_character_class_idx" ON "character_templates"("character_class");

-- CreateIndex
CREATE INDEX "character_template_variants_variant_id_idx" ON "character_template_variants"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_key_key" ON "skills"("key");

-- CreateIndex
CREATE INDEX "skills_variant_id_min_level_idx" ON "skills"("variant_id", "min_level");

-- CreateIndex
CREATE INDEX "skills_kit_class_variant_id_idx" ON "skills"("kit_class", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

-- CreateIndex
CREATE INDEX "characters_account_id_idx" ON "characters"("account_id");

-- CreateIndex
CREATE INDEX "characters_template_id_idx" ON "characters"("template_id");

-- CreateIndex
CREATE INDEX "character_traits_trait_id_idx" ON "character_traits"("trait_id");

-- CreateIndex
CREATE INDEX "character_skills_skill_id_idx" ON "character_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_skills_character_id_build_slot_key" ON "character_skills"("character_id", "build_slot");

-- CreateIndex
CREATE INDEX "squads_account_id_idx" ON "squads"("account_id");

-- CreateIndex
CREATE INDEX "squad_members_character_id_idx" ON "squad_members"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "squad_members_squad_id_row_column_key" ON "squad_members"("squad_id", "row", "column");

-- CreateIndex
CREATE UNIQUE INDEX "npc_squads_key_key" ON "npc_squads"("key");

-- CreateIndex
CREATE INDEX "npc_squads_difficulty_profile_idx" ON "npc_squads"("difficulty", "profile");

-- CreateIndex
CREATE INDEX "npc_squad_members_template_id_idx" ON "npc_squad_members"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "npc_squad_members_npc_squad_id_template_id_key" ON "npc_squad_members"("npc_squad_id", "template_id");

-- CreateIndex
CREATE UNIQUE INDEX "npc_squad_members_npc_squad_id_row_column_key" ON "npc_squad_members"("npc_squad_id", "row", "column");

-- CreateIndex
CREATE INDEX "npc_squad_member_skills_skill_id_idx" ON "npc_squad_member_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "npc_squad_member_skills_member_id_build_slot_key" ON "npc_squad_member_skills"("member_id", "build_slot");

-- CreateIndex
CREATE INDEX "npc_squad_member_traits_trait_id_idx" ON "npc_squad_member_traits"("trait_id");

-- CreateIndex
CREATE INDEX "battles_account_id_started_at_idx" ON "battles"("account_id", "started_at");

-- CreateIndex
CREATE INDEX "battles_npc_squad_id_idx" ON "battles"("npc_squad_id");

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_awakens_from_id_fkey" FOREIGN KEY ("awakens_from_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traits" ADD CONSTRAINT "traits_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_templates" ADD CONSTRAINT "character_templates_family_trait_id_fkey" FOREIGN KEY ("family_trait_id") REFERENCES "traits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_template_variants" ADD CONSTRAINT "character_template_variants_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "character_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_template_variants" ADD CONSTRAINT "character_template_variants_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "character_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_awakened_variant_id_fkey" FOREIGN KEY ("awakened_variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_traits" ADD CONSTRAINT "character_traits_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_traits" ADD CONSTRAINT "character_traits_trait_id_fkey" FOREIGN KEY ("trait_id") REFERENCES "traits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squads" ADD CONSTRAINT "squads_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_squad_members" ADD CONSTRAINT "npc_squad_members_npc_squad_id_fkey" FOREIGN KEY ("npc_squad_id") REFERENCES "npc_squads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_squad_members" ADD CONSTRAINT "npc_squad_members_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "character_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_squad_members" ADD CONSTRAINT "npc_squad_members_awakened_variant_id_fkey" FOREIGN KEY ("awakened_variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_squad_member_skills" ADD CONSTRAINT "npc_squad_member_skills_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "npc_squad_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_squad_member_skills" ADD CONSTRAINT "npc_squad_member_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_squad_member_traits" ADD CONSTRAINT "npc_squad_member_traits_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "npc_squad_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_squad_member_traits" ADD CONSTRAINT "npc_squad_member_traits_trait_id_fkey" FOREIGN KEY ("trait_id") REFERENCES "traits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_npc_squad_id_fkey" FOREIGN KEY ("npc_squad_id") REFERENCES "npc_squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_actions" ADD CONSTRAINT "battle_actions_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
