-- CreateEnum
CREATE TYPE "DispatchChannel" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'CONFIRMED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'WHATSAPP_DISPATCH_QUEUED';
ALTER TYPE "AuditEventType" ADD VALUE 'WHATSAPP_DISPATCH_SENT';
ALTER TYPE "AuditEventType" ADD VALUE 'WHATSAPP_DISPATCH_DELIVERED';
ALTER TYPE "AuditEventType" ADD VALUE 'WHATSAPP_DISPATCH_READ';
ALTER TYPE "AuditEventType" ADD VALUE 'WHATSAPP_DISPATCH_FAILED';
ALTER TYPE "AuditEventType" ADD VALUE 'WHATSAPP_PATIENT_CONFIRMED';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "whatsappAccessTokenEnc" TEXT,
ADD COLUMN     "whatsappBusinessAccountId" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappPhoneNumberId" TEXT,
ADD COLUMN     "whatsappVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "whatsappWebhookVerifyToken" TEXT;

-- CreateTable
CREATE TABLE "ChannelDispatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stageTransitionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "channel" "DispatchChannel" NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'QUEUED',
    "externalMessageId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "documentFileName" TEXT,
    "documentR2Key" TEXT,
    "presignedUrl" TEXT,
    "errorDetail" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmationPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelDispatch_tenantId_createdAt_idx" ON "ChannelDispatch"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ChannelDispatch_stageTransitionId_idx" ON "ChannelDispatch"("stageTransitionId");

-- CreateIndex
CREATE INDEX "ChannelDispatch_externalMessageId_idx" ON "ChannelDispatch"("externalMessageId");

-- CreateIndex
CREATE INDEX "ChannelDispatch_clientId_createdAt_idx" ON "ChannelDispatch"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChannelDispatch" ADD CONSTRAINT "ChannelDispatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelDispatch" ADD CONSTRAINT "ChannelDispatch_stageTransitionId_fkey" FOREIGN KEY ("stageTransitionId") REFERENCES "StageTransition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelDispatch" ADD CONSTRAINT "ChannelDispatch_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
