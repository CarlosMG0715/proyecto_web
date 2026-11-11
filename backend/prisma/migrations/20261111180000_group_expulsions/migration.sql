CREATE TABLE "group_expulsions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_expulsions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "group_expulsions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "group_expulsions_userId_createdAt_idx" ON "group_expulsions"("userId", "createdAt");
