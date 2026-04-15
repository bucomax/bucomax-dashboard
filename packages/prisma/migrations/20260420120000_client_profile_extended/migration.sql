-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('mother', 'father', 'legal_guardian', 'other');

-- CreateEnum
CREATE TYPE "PatientPreferredChannel" AS ENUM ('email', 'whatsapp', 'sms', 'none');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "guardianRelationship" "GuardianRelationship",
ADD COLUMN     "guardianEmail" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "preferredChannel" "PatientPreferredChannel" NOT NULL DEFAULT 'none';
