-- AlterTable
ALTER TABLE "PatientSelfRegisterInvite" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE INDEX "PatientSelfRegisterInvite_tenantId_clientId_idx" ON "PatientSelfRegisterInvite"("tenantId", "clientId");

-- AddForeignKey
ALTER TABLE "PatientSelfRegisterInvite" ADD CONSTRAINT "PatientSelfRegisterInvite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
