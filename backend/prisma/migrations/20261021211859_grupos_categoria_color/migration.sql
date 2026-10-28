-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'General',
ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#8b5cf6',
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';
