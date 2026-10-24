-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('PLAYER', 'ADMIN');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "role" "AccountRole" NOT NULL DEFAULT 'PLAYER';
