-- DropIndex (unique on clientId — now allows multiple pathways per client)
DROP INDEX IF EXISTS "PatientPathway_clientId_key";

-- AlterTable: add completedAt column
ALTER TABLE "PatientPathway" ADD COLUMN "completedAt" TIMESTAMP(3);

-- CreateIndex (non-unique index on clientId)
CREATE INDEX "PatientPathway_clientId_idx" ON "PatientPathway"("clientId");
