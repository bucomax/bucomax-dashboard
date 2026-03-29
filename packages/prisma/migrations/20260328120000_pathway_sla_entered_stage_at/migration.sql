-- AlterTable PathwayStage: SLA opcional por etapa (Bucomax)
ALTER TABLE "PathwayStage" ADD COLUMN "alertWarningDays" INTEGER,
ADD COLUMN "alertCriticalDays" INTEGER;

-- AlterTable PatientPathway: início da permanência na etapa atual
ALTER TABLE "PatientPathway" ADD COLUMN "enteredStageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "PatientPathway" SET "enteredStageAt" = "updatedAt";

-- CreateIndex
CREATE INDEX "PatientPathway_pathwayVersionId_currentStageId_idx" ON "PatientPathway"("pathwayVersionId", "currentStageId");
