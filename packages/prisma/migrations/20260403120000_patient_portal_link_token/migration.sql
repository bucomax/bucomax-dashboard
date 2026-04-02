-- CreateTable
CREATE TABLE "PatientPortalLinkToken" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientPortalLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientPortalLinkToken_token_key" ON "PatientPortalLinkToken"("token");

-- CreateIndex
CREATE INDEX "PatientPortalLinkToken_clientId_idx" ON "PatientPortalLinkToken"("clientId");

-- AddForeignKey
ALTER TABLE "PatientPortalLinkToken" ADD CONSTRAINT "PatientPortalLinkToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
