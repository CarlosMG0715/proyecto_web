-- category y color tambien existen en ramas que añadieron personalizacion antes.
-- IF NOT EXISTS permite aplicar ambas lineas de migracion al combinar esas ramas.
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#8b5cf6';
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
