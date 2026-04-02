-- AlterTable
ALTER TABLE "PathwayStage" ADD COLUMN "defaultAssigneeUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill from legacy single assignee
UPDATE "PathwayStage"
SET "defaultAssigneeUserIds" = ARRAY["defaultAssigneeUserId"]::TEXT[]
WHERE "defaultAssigneeUserId" IS NOT NULL;
