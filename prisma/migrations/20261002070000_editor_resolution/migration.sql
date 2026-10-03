-- CreateEnum
CREATE TYPE "EditorResolution" AS ENUM ('CONFIRM', 'REJECT');

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "editorResolution" "EditorResolution",
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "editorResolution" "EditorResolution",
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT;
