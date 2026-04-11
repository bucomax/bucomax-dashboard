-- AlterTable: add address and guardian fields to Client
ALTER TABLE "Client" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Client" ADD COLUMN "addressLine" TEXT;
ALTER TABLE "Client" ADD COLUMN "addressNumber" TEXT;
ALTER TABLE "Client" ADD COLUMN "addressComp" TEXT;
ALTER TABLE "Client" ADD COLUMN "neighborhood" TEXT;
ALTER TABLE "Client" ADD COLUMN "city" TEXT;
ALTER TABLE "Client" ADD COLUMN "state" TEXT;
ALTER TABLE "Client" ADD COLUMN "isMinor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "guardianName" TEXT;
ALTER TABLE "Client" ADD COLUMN "guardianDocumentId" TEXT;
ALTER TABLE "Client" ADD COLUMN "guardianPhone" TEXT;
