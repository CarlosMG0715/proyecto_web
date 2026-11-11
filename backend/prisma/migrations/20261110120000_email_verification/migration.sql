ALTER TABLE "users"
  ADD COLUMN "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ(3),
  ADD COLUMN "emailVerificationHash" TEXT,
  ADD COLUMN "emailVerificationExpiresAt" TIMESTAMPTZ(3),
  ADD COLUMN "emailVerificationSentAt" TIMESTAMPTZ(3);

ALTER TABLE "users" ALTER COLUMN "emailVerificationRequired" SET DEFAULT true;
CREATE UNIQUE INDEX "users_emailVerificationHash_key" ON "users" ("emailVerificationHash");
