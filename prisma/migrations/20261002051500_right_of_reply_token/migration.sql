-- AlterTable
ALTER TABLE "RightOfReply" ADD COLUMN     "evidenceUrls" TEXT[],
ADD COLUMN     "recipientEmail" TEXT,
ADD COLUMN     "tokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RightOfReply_tokenHash_key" ON "RightOfReply"("tokenHash");
