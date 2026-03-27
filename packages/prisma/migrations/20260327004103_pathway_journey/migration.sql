-- CreateTable
CREATE TABLE "CarePathway" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayVersion" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "graphJson" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayStage" (
    "id" TEXT NOT NULL,
    "pathwayVersionId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "patientMessage" TEXT,

    CONSTRAINT "PathwayStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientPathway" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "pathwayVersionId" TEXT NOT NULL,
    "currentStageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientPathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageTransition" (
    "id" TEXT NOT NULL,
    "patientPathwayId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "note" TEXT,
    "dispatchStub" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarePathway_tenantId_idx" ON "CarePathway"("tenantId");

-- CreateIndex
CREATE INDEX "PathwayVersion_pathwayId_published_idx" ON "PathwayVersion"("pathwayId", "published");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayVersion_pathwayId_version_key" ON "PathwayVersion"("pathwayId", "version");

-- CreateIndex
CREATE INDEX "PathwayStage_pathwayVersionId_sortOrder_idx" ON "PathwayStage"("pathwayVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PathwayStage_pathwayVersionId_stageKey_key" ON "PathwayStage"("pathwayVersionId", "stageKey");

-- CreateIndex
CREATE UNIQUE INDEX "PatientPathway_clientId_key" ON "PatientPathway"("clientId");

-- CreateIndex
CREATE INDEX "PatientPathway_tenantId_idx" ON "PatientPathway"("tenantId");

-- CreateIndex
CREATE INDEX "PatientPathway_pathwayId_idx" ON "PatientPathway"("pathwayId");

-- CreateIndex
CREATE INDEX "StageTransition_patientPathwayId_idx" ON "StageTransition"("patientPathwayId");

-- AddForeignKey
ALTER TABLE "CarePathway" ADD CONSTRAINT "CarePathway_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayVersion" ADD CONSTRAINT "PathwayVersion_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "CarePathway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayStage" ADD CONSTRAINT "PathwayStage_pathwayVersionId_fkey" FOREIGN KEY ("pathwayVersionId") REFERENCES "PathwayVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPathway" ADD CONSTRAINT "PatientPathway_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPathway" ADD CONSTRAINT "PatientPathway_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPathway" ADD CONSTRAINT "PatientPathway_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "CarePathway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPathway" ADD CONSTRAINT "PatientPathway_pathwayVersionId_fkey" FOREIGN KEY ("pathwayVersionId") REFERENCES "PathwayVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientPathway" ADD CONSTRAINT "PatientPathway_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "PathwayStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageTransition" ADD CONSTRAINT "StageTransition_patientPathwayId_fkey" FOREIGN KEY ("patientPathwayId") REFERENCES "PatientPathway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageTransition" ADD CONSTRAINT "StageTransition_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "PathwayStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageTransition" ADD CONSTRAINT "StageTransition_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "PathwayStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageTransition" ADD CONSTRAINT "StageTransition_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
