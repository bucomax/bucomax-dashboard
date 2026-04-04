-- AlterTable
ALTER TABLE "PatientPortalLinkToken" ADD COLUMN "singleUse" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PatientPortalOtpChallenge" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientPortalOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientPortalOtpChallenge_tenantId_clientId_idx" ON "PatientPortalOtpChallenge"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "PatientPortalOtpChallenge_createdAt_idx" ON "PatientPortalOtpChallenge"("createdAt");

-- AddForeignKey
ALTER TABLE "PatientPortalOtpChallenge" ADD CONSTRAINT "PatientPortalOtpChallenge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
