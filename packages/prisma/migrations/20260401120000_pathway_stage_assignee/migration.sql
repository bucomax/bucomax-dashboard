-- AlterTable
ALTER TABLE "PathwayStage" ADD COLUMN     "defaultAssigneeUserId" TEXT;

-- AlterTable
ALTER TABLE "PatientPathway" ADD COLUMN     "currentStageAssigneeUserId" TEXT;

-- CreateIndex
CREATE INDEX "PathwayStage_defaultAssigneeUserId_idx" ON "PathwayStage"("defaultAssigneeUserId");

-- CreateIndex
CREATE INDEX "PatientPathway_currentStageAssigneeUserId_idx" ON "PatientPathway"("currentStageAssigneeUserId");

-- AddForeignKey
ALTER TABLE "PathwayStage" ADD CONSTRAINT "PathwayStage_defaultAssigneeUserId_fkey" FOREIGN KEY ("defaultAssigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPathway" ADD CONSTRAINT "PatientPathway_currentStageAssigneeUserId_fkey" FOREIGN KEY ("currentStageAssigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
