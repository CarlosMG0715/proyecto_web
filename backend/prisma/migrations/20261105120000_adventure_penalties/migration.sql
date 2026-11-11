ALTER TABLE "group_memberships" ADD COLUMN "fallenAt" TIMESTAMPTZ(3);
ALTER TABLE "group_join_requests" ADD COLUMN "isReturn" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "pending_adventure_return" ON "group_join_requests" ("groupId", "requesterId")
WHERE "isReturn" AND "status" = 'PENDING';
