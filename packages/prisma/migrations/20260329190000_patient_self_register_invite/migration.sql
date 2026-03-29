-- CreateTable
CREATE TABLE "PatientSelfRegisterInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientSelfRegisterInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientSelfRegisterInvite_token_key" ON "PatientSelfRegisterInvite"("token");

-- CreateIndex
CREATE INDEX "PatientSelfRegisterInvite_tenantId_idx" ON "PatientSelfRegisterInvite"("tenantId");

-- AddForeignKey
ALTER TABLE "PatientSelfRegisterInvite" ADD CONSTRAINT "PatientSelfRegisterInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientSelfRegisterInvite" ADD CONSTRAINT "PatientSelfRegisterInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
