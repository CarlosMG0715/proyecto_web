BEGIN;
-- Conserva los checks grupales anteriores en la tabla unificada de checks por hábito.
INSERT INTO "check_ins" ("id", "habitId", "userId", "checkInDate", "checkedAt", "note")
SELECT md5(d."groupId" || d."userId" || d."localDate"::text || h."id"), h."id", d."userId", d."localDate", NOW(), COALESCE(d."note", '')
FROM "group_daily_checks" d JOIN "habits" h ON h."groupId" = d."groupId" AND h."id" = ANY(d."completedHabitIds")
ON CONFLICT ("habitId", "userId", "checkInDate") DO NOTHING;
-- DropForeignKey
ALTER TABLE "group_daily_checks" DROP CONSTRAINT "group_daily_checks_groupId_fkey";

-- DropForeignKey
ALTER TABLE "group_daily_checks" DROP CONSTRAINT "group_daily_checks_userId_fkey";

-- DropForeignKey
ALTER TABLE "habit_participations" DROP CONSTRAINT "habit_participations_habitId_fkey";

-- DropForeignKey
ALTER TABLE "habit_participations" DROP CONSTRAINT "habit_participations_userId_fkey";

-- DropForeignKey
ALTER TABLE "penalties" DROP CONSTRAINT "penalties_habitId_fkey";

-- DropForeignKey
ALTER TABLE "group_join_requests" DROP CONSTRAINT "group_join_requests_groupId_fkey";

-- DropForeignKey
ALTER TABLE "group_join_requests" DROP CONSTRAINT "group_join_requests_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "group_join_requests" DROP CONSTRAINT "group_join_requests_decidedById_fkey";

-- DropForeignKey
ALTER TABLE "group_expulsions" DROP CONSTRAINT "group_expulsions_userId_fkey";

-- DropForeignKey
ALTER TABLE "streak_pokes" DROP CONSTRAINT "streak_pokes_groupId_fkey";

-- DropForeignKey
ALTER TABLE "streak_pokes" DROP CONSTRAINT "streak_pokes_senderId_fkey";

-- DropForeignKey
ALTER TABLE "streak_pokes" DROP CONSTRAINT "streak_pokes_recipientId_fkey";

-- DropIndex
DROP INDEX "users_emailVerificationHash_key";

-- DropIndex
DROP INDEX "penalties_userId_status_idx";

-- DropIndex
DROP INDEX "messages_contextType_contextId_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "emailVerificationExpiresAt",
DROP COLUMN "emailVerificationHash",
DROP COLUMN "emailVerificationRequired",
DROP COLUMN "emailVerificationSentAt",
DROP COLUMN "emailVerifiedAt",
DROP COLUMN "lastReminderDay",
DROP COLUMN "notificationPreferences";

-- AlterTable
ALTER TABLE "groups" DROP COLUMN "archivedAt",
DROP COLUMN "category",
DROP COLUMN "description",
DROP COLUMN "penaltyThreshold",
DROP COLUMN "targetDays";

-- AlterTable
ALTER TABLE "habits" DROP COLUMN "icon";

-- AlterTable
ALTER TABLE "check_ins" DROP COLUMN "note";

-- AlterTable
ALTER TABLE "penalties" DROP COLUMN "habitId",
DROP COLUMN "points",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "dropout_risks" DROP COLUMN "lastNotifiedLevel",
DROP COLUMN "previousRate",
DROP COLUMN "recentRate",
DROP COLUMN "score";

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "contextId";

-- DropTable
DROP TABLE "group_daily_checks";

-- DropTable
DROP TABLE "habit_participations";

-- DropTable
DROP TABLE "group_join_requests";

-- DropTable
DROP TABLE "group_expulsions";

-- DropTable
DROP TABLE "streak_pokes";

-- DropEnum
DROP TYPE "PenaltyStatus";

-- DropEnum
DROP TYPE "JoinRequestStatus";

-- CreateIndex
CREATE INDEX "penalties_userId_idx" ON "penalties"("userId");

-- CreateIndex
CREATE INDEX "messages_contextType_idx" ON "messages"("contextType");

COMMIT;

