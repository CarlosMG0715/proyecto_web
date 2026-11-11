ALTER TABLE "users"
  ADD COLUMN "pendingEmail" TEXT,
  ADD COLUMN "emailChangeHash" TEXT,
  ADD COLUMN "emailChangeExpiresAt" TIMESTAMPTZ(3),
  ADD COLUMN "emailChangeSentAt" TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "users_emailChangeHash_key" ON "users"("emailChangeHash");
