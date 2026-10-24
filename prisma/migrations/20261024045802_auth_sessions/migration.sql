-- Login por username + senha (data_model.md 3.5) e sessões com refresh token.
-- AlterTable
-- Contas criadas antes do login ficam com hash vazio (não entram até ganhar senha; o seed dá senha à tester_01).
ALTER TABLE "accounts" ADD COLUMN     "password_hash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "accounts" ALTER COLUMN "password_hash" DROP DEFAULT;

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_account_id_idx" ON "sessions"("account_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
