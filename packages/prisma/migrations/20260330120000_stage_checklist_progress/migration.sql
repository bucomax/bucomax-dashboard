-- CreateTable
CREATE TABLE "PathwayStageChecklistItem" (
    "id" TEXT NOT NULL,
    "pathwayStageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathwayStageChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPathwayChecklistItem" (
    "id" TEXT NOT NULL,
    "patientPathwayId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPathwayChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PathwayStageChecklistItem_pathwayStageId_sortOrder_idx" ON "PathwayStageChecklistItem"("pathwayStageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PatientPathwayChecklistItem_patientPathwayId_checklistItemId_key" ON "PatientPathwayChecklistItem"("patientPathwayId", "checklistItemId");

-- CreateIndex
CREATE INDEX "PatientPathwayChecklistItem_patientPathwayId_idx" ON "PatientPathwayChecklistItem"("patientPathwayId");

-- CreateIndex
CREATE INDEX "PatientPathwayChecklistItem_checklistItemId_idx" ON "PatientPathwayChecklistItem"("checklistItemId");

-- AddForeignKey
ALTER TABLE "PathwayStageChecklistItem" ADD CONSTRAINT "PathwayStageChecklistItem_pathwayStageId_fkey" FOREIGN KEY ("pathwayStageId") REFERENCES "PathwayStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientPathwayChecklistItem" ADD CONSTRAINT "PatientPathwayChecklistItem_patientPathwayId_fkey" FOREIGN KEY ("patientPathwayId") REFERENCES "PatientPathway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientPathwayChecklistItem" ADD CONSTRAINT "PatientPathwayChecklistItem_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "PathwayStageChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientPathwayChecklistItem" ADD CONSTRAINT "PatientPathwayChecklistItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
