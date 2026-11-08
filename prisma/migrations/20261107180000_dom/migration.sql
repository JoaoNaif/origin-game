-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "dom" JSONB NOT NULL DEFAULT '{"pillars":{},"history":[],"weightSinceCheck":0}';
