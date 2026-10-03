-- NOTE: the pgvector HNSW index is created via raw SQL and is invisible to Prisma;
-- Prisma proposes dropping it on every diff. Never include that DropIndex.
-- AlterTable
ALTER TABLE "Takedown" ADD COLUMN     "evidenceUrls" TEXT[],
ADD COLUMN     "requesterName" TEXT;

-- CreateIndex
CREATE INDEX "Takedown_requesterEmail_createdAt_idx" ON "Takedown"("requesterEmail", "createdAt");

-- CreateIndex
CREATE INDEX "Takedown_targetType_targetId_idx" ON "Takedown"("targetType", "targetId");
