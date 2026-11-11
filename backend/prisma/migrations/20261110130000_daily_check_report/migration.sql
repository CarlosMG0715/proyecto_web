ALTER TABLE "group_daily_checks"
  ADD COLUMN "completedHabitIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "note" TEXT;
