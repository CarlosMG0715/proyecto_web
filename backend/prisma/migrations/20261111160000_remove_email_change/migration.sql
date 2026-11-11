DROP INDEX IF EXISTS "users_emailChangeHash_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "pendingEmail", DROP COLUMN IF EXISTS "emailChangeHash", DROP COLUMN IF EXISTS "emailChangeExpiresAt", DROP COLUMN IF EXISTS "emailChangeSentAt";
