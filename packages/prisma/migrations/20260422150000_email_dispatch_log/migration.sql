-- CreateEnum
CREATE TYPE "EmailDispatchLogStatus" AS ENUM ('SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'OPENED', 'FAILED');

-- CreateTable
CREATE TABLE "EmailDispatchLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resendMessageId" TEXT NOT NULL,
    "jobKind" TEXT NOT NULL,
    "recipientEmailHash" TEXT NOT NULL,
    "status" "EmailDispatchLogStatus" NOT NULL DEFAULT 'SENT',
    "lastResendEventType" TEXT,
    "lastResendEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDispatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailDispatchLog_resendMessageId_key" ON "EmailDispatchLog"("resendMessageId");

-- CreateIndex
CREATE INDEX "EmailDispatchLog_tenantId_createdAt_idx" ON "EmailDispatchLog"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailDispatchLog" ADD CONSTRAINT "EmailDispatchLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
