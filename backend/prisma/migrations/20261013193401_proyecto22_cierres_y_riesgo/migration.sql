/*
  Warnings:

  - The required column `familyId` was added to the `sessions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ContextType" AS ENUM ('CHECK_IN', 'PENALTY', 'DROPOUT_RISK', 'DAILY_CLOSURE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_userId_fkey";

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "penaltyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "contextId" TEXT,
ADD COLUMN     "contextType" "ContextType",
ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'USER',
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "penalties" ADD COLUMN     "closureId" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "familyId" TEXT NOT NULL,
ADD COLUMN     "lastUsedAt" TIMESTAMPTZ(3),
ADD COLUMN     "replacedById" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "daily_closures" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "expectedCheckIns" INTEGER NOT NULL,
    "completedCheckIns" INTEGER NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "penaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dropout_risks" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "consecutiveMisses" INTEGER NOT NULL DEFAULT 0,
    "recentRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastNotifiedLevel" "RiskLevel",
    "computedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dropout_risks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_closures_groupId_processedAt_idx" ON "daily_closures"("groupId", "processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_closures_groupId_localDate_key" ON "daily_closures"("groupId", "localDate");

-- CreateIndex
CREATE INDEX "dropout_risks_groupId_level_idx" ON "dropout_risks"("groupId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "dropout_risks_groupId_userId_key" ON "dropout_risks"("groupId", "userId");

-- CreateIndex
CREATE INDEX "messages_contextType_contextId_idx" ON "messages"("contextType", "contextId");

-- CreateIndex
CREATE INDEX "penalties_closureId_idx" ON "penalties"("closureId");

-- CreateIndex
CREATE INDEX "sessions_familyId_idx" ON "sessions"("familyId");

-- AddForeignKey
ALTER TABLE "daily_closures" ADD CONSTRAINT "daily_closures_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "daily_closures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dropout_risks" ADD CONSTRAINT "dropout_risks_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dropout_risks" ADD CONSTRAINT "dropout_risks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
