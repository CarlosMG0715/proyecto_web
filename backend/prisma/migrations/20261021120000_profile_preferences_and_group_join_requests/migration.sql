ALTER TABLE "users" ADD COLUMN "characterId" TEXT NOT NULL DEFAULT 'sprout';
ALTER TABLE "users" ADD COLUMN "themeId" TEXT NOT NULL DEFAULT 'sprout';
ALTER TABLE "groups" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "groups" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#8b5cf6';
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TABLE "group_join_requests" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMPTZ(3),
  "decidedById" TEXT,
  CONSTRAINT "group_join_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "group_join_requests_groupId_status_createdAt_idx" ON "group_join_requests"("groupId", "status", "createdAt");
CREATE INDEX "group_join_requests_requesterId_status_idx" ON "group_join_requests"("requesterId", "status");
ALTER TABLE "group_join_requests" ADD CONSTRAINT "group_join_requests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_join_requests" ADD CONSTRAINT "group_join_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_join_requests" ADD CONSTRAINT "group_join_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
