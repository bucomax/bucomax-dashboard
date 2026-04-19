-- CreateEnum
CREATE TYPE "AppCategory" AS ENUM ('communication', 'ai', 'scheduling', 'clinical', 'financial', 'integration');

-- CreateEnum
CREATE TYPE "AppRenderMode" AS ENUM ('iframe', 'internal', 'external_link');

-- CreateEnum
CREATE TYPE "AppPricingModel" AS ENUM ('free', 'flat', 'per_seat', 'usage_based');

-- CreateEnum
CREATE TYPE "AppBillingInterval" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "TenantAppStatus" AS ENUM ('pending_config', 'active', 'suspended', 'inactive');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('none', 'trialing', 'active_subscription', 'past_due', 'canceled', 'unpaid', 'suspended_subscription');

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "iconFileId" TEXT,
    "accentColor" TEXT,
    "developerName" TEXT,
    "developerUrl" TEXT,
    "category" "AppCategory" NOT NULL DEFAULT 'integration',
    "renderMode" "AppRenderMode" NOT NULL DEFAULT 'iframe',
    "iframeBaseUrl" TEXT,
    "internalRoute" TEXT,
    "requiresConfig" BOOLEAN NOT NULL DEFAULT false,
    "configSchema" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pricingModel" "AppPricingModel" NOT NULL DEFAULT 'free',
    "priceInCents" INTEGER,
    "priceCurrency" TEXT NOT NULL DEFAULT 'BRL',
    "billingInterval" "AppBillingInterval" NOT NULL DEFAULT 'monthly',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "externalProductId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppScreenshot" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "caption" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AppScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantApp" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "status" "TenantAppStatus" NOT NULL DEFAULT 'pending_config',
    "configEncrypted" JSONB,
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "externalSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'none',
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "App_slug_key" ON "App"("slug");

-- CreateIndex
CREATE INDEX "App_isPublished_sortOrder_idx" ON "App"("isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "AppScreenshot_appId_sortOrder_idx" ON "AppScreenshot"("appId", "sortOrder");

-- CreateIndex
CREATE INDEX "TenantApp_tenantId_status_idx" ON "TenantApp"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TenantApp_externalSubscriptionId_idx" ON "TenantApp"("externalSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantApp_tenantId_appId_key" ON "TenantApp"("tenantId", "appId");

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_iconFileId_fkey" FOREIGN KEY ("iconFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppScreenshot" ADD CONSTRAINT "AppScreenshot_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppScreenshot" ADD CONSTRAINT "AppScreenshot_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApp" ADD CONSTRAINT "TenantApp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApp" ADD CONSTRAINT "TenantApp_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApp" ADD CONSTRAINT "TenantApp_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "PatientPathwayChecklistItem_patientPathwayId_checklistItemId_ke" RENAME TO "PatientPathwayChecklistItem_patientPathwayId_checklistItemI_key";
