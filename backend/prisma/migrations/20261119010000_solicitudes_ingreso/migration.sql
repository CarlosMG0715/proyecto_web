CREATE TABLE "group_join_requests" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "group_join_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "group_join_requests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "group_join_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "group_join_requests_groupId_requesterId_key" ON "group_join_requests"("groupId", "requesterId");
CREATE INDEX "group_join_requests_groupId_createdAt_idx" ON "group_join_requests"("groupId", "createdAt");
