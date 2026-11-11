CREATE TABLE "streak_pokes" (
  "id" TEXT PRIMARY KEY,
  "groupId" TEXT NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "recipientId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "localDate" DATE NOT NULL
);
CREATE UNIQUE INDEX "streak_pokes_groupId_senderId_recipientId_localDate_key"
  ON "streak_pokes" ("groupId", "senderId", "recipientId", "localDate");
CREATE INDEX "streak_pokes_recipientId_localDate_idx" ON "streak_pokes" ("recipientId", "localDate");
