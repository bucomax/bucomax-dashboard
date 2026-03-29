-- CreateTable
CREATE TABLE "PatientNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientNote_tenantId_clientId_createdAt_idx" ON "PatientNote"("tenantId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientNote_authorUserId_idx" ON "PatientNote"("authorUserId");

-- AddForeignKey
ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
