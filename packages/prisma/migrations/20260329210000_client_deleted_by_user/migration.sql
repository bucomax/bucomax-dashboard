-- AlterTable
ALTER TABLE "Client" ADD COLUMN "deletedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Client_deletedByUserId_idx" ON "Client"("deletedByUserId");
