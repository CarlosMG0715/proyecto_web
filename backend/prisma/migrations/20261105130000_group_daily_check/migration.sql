ALTER TYPE "ContextType" ADD VALUE 'HABIT_CREATED';

CREATE TABLE "group_daily_checks" (
  "groupId" TEXT NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "localDate" DATE NOT NULL,
  PRIMARY KEY ("groupId", "userId", "localDate")
);
CREATE INDEX "group_daily_checks_userId_localDate_idx" ON "group_daily_checks" ("userId", "localDate");
INSERT INTO "group_daily_checks" ("groupId", "userId", "localDate")
SELECT DISTINCT h."groupId", c."userId", c."checkInDate"
FROM "check_ins" c JOIN "habits" h ON h."id" = c."habitId";

CREATE TABLE "habit_participations" (
  "habitId" TEXT NOT NULL REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("habitId", "userId")
);
