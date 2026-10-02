-- CreateEnum
CREATE TYPE "ReplyReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "RightOfReply" ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewStatus" "ReplyReviewStatus",
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- AddForeignKey
ALTER TABLE "RightOfReply" ADD CONSTRAINT "RightOfReply_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
