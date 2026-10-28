-- agrega una nota a los check-ins y un icono persistente a cada habito.
ALTER TABLE "check_ins" ADD COLUMN "note" TEXT NOT NULL DEFAULT '';
ALTER TABLE "habits" ADD COLUMN "icon" TEXT NOT NULL DEFAULT '🎯';
