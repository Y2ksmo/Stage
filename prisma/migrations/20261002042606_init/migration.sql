-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('READER', 'CONTRIBUTOR', 'REVIEWER', 'EDITOR', 'LEGAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "LeaderStatus" AS ENUM ('ACTIVE', 'DECEASED', 'RETIRED', 'UNDER_INVESTIGATION');

-- CreateEnum
CREATE TYPE "PublishState" AS ENUM ('DRAFT', 'IN_REVIEW', 'VERIFIED', 'DISPUTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ClaimOutcome" AS ENUM ('PENDING', 'FULFILLED', 'FAILED', 'RETRACTED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('FINANCIAL_OPACITY', 'COERCED_GIVING', 'LUXURY_FUNDING', 'SCANDAL_MORAL', 'EMOTIONAL_MANIPULATION', 'ISOLATION_TACTICS', 'AUTHORITARIAN_CONTROL', 'DOCTRINAL_DEVIATION', 'ABUSE_ALLEGATION', 'LEGAL_FINDING', 'BITE_BEHAVIOR', 'BITE_INFORMATION', 'BITE_THOUGHT', 'BITE_EMOTIONAL');

-- CreateEnum
CREATE TYPE "ScoreDimension" AS ENUM ('PREDICTION', 'FINANCIAL', 'BEHAVIORAL', 'DOCTRINAL', 'CULTIC');

-- CreateEnum
CREATE TYPE "SourceTier" AS ENUM ('PRIMARY', 'TIER1_MEDIA', 'SECONDARY', 'SOCIAL');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('URL', 'ARCHIVE_SNAPSHOT', 'PDF', 'VIDEO_TIMESTAMP', 'FILING', 'SCREENSHOT');

-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('CONFIRM', 'REJECT', 'NEEDS_MORE');

-- CreateEnum
CREATE TYPE "ReviewKind" AS ENUM ('COMMUNITY_REVIEW', 'FINANCIAL_AUDIT', 'BITE_ASSESSMENT');

-- CreateEnum
CREATE TYPE "ReplyStatus" AS ENUM ('NOT_OFFERED', 'OFFERED', 'RECEIVED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TakedownStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'UPHELD', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'READER',
    "reputation" INTEGER NOT NULL DEFAULT 10,
    "emailVerifiedAt" TIMESTAMP(3),
    "suspendedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leader" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "aliases" TEXT[],
    "bio" TEXT,
    "publicProfileUrls" TEXT[],
    "status" "LeaderStatus" NOT NULL DEFAULT 'ACTIVE',
    "tradition" TEXT,
    "country" TEXT,
    "replyContact" TEXT,
    "statementOfRecord" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "registrationId" TEXT,
    "jurisdiction" TEXT,
    "publishesAudit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliation" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Affiliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "statementText" TEXT NOT NULL,
    "summary" TEXT,
    "dateMade" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "specificity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceUrl" TEXT NOT NULL,
    "sourceTimestamp" TEXT,
    "outcome" "ClaimOutcome" NOT NULL DEFAULT 'PENDING',
    "outcomeNote" TEXT,
    "outcomeDecidedAt" TIMESTAMP(3),
    "state" "PublishState" NOT NULL DEFAULT 'DRAFT',
    "replyStatus" "ReplyStatus" NOT NULL DEFAULT 'NOT_OFFERED',
    "replyDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimVersion" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "editedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "category" "IncidentCategory" NOT NULL,
    "dimension" "ScoreDimension" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "severity" INTEGER NOT NULL,
    "officialFinding" BOOLEAN NOT NULL DEFAULT false,
    "isAllegationOnly" BOOLEAN NOT NULL DEFAULT true,
    "state" "PublishState" NOT NULL DEFAULT 'DRAFT',
    "replyStatus" "ReplyStatus" NOT NULL DEFAULT 'NOT_OFFERED',
    "replyDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "url" TEXT,
    "archiveUrl" TEXT,
    "sha256" TEXT,
    "tier" "SourceTier" NOT NULL,
    "publisherKey" TEXT NOT NULL,
    "ownershipGroup" TEXT,
    "excerpt" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkRotAt" TIMESTAMP(3),
    "claimId" TEXT,
    "incidentId" TEXT,
    "reviewId" TEXT,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationVote" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "claimId" TEXT,
    "incidentId" TEXT,
    "value" "VoteValue" NOT NULL,
    "rationale" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "conflictDeclared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "ReviewKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "structured" JSONB,
    "state" "PublishState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiteItem" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,

    CONSTRAINT "BiteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RightOfReply" (
    "id" TEXT NOT NULL,
    "claimId" TEXT,
    "incidentId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseText" TEXT,
    "respondedAt" TIMESTAMP(3),
    "publishedWithItem" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RightOfReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Takedown" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "grounds" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "status" "TakedownStatus" NOT NULL DEFAULT 'OPEN',
    "decidedBy" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Takedown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbuseReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbuseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSnapshot" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "riskScore" INTEGER,
    "band" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "dimensions" JSONB NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptChunk" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "startSec" INTEGER,
    "endSec" INTEGER,
    "text" TEXT NOT NULL,
    "embedding" vector(1536),
    "candidateClaim" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TranscriptChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Leader_slug_key" ON "Leader"("slug");

-- CreateIndex
CREATE INDEX "Leader_displayName_idx" ON "Leader"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliation_leaderId_orgId_role_key" ON "Affiliation"("leaderId", "orgId", "role");

-- CreateIndex
CREATE INDEX "Claim_leaderId_state_outcome_idx" ON "Claim"("leaderId", "state", "outcome");

-- CreateIndex
CREATE INDEX "Claim_targetDate_idx" ON "Claim"("targetDate");

-- CreateIndex
CREATE INDEX "Incident_leaderId_dimension_state_idx" ON "Incident"("leaderId", "dimension", "state");

-- CreateIndex
CREATE INDEX "Evidence_claimId_idx" ON "Evidence"("claimId");

-- CreateIndex
CREATE INDEX "Evidence_incidentId_idx" ON "Evidence"("incidentId");

-- CreateIndex
CREATE INDEX "Evidence_publisherKey_idx" ON "Evidence"("publisherKey");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationVote_reviewerId_claimId_key" ON "VerificationVote"("reviewerId", "claimId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationVote_reviewerId_incidentId_key" ON "VerificationVote"("reviewerId", "incidentId");

-- CreateIndex
CREATE INDEX "Review_leaderId_kind_state_idx" ON "Review"("leaderId", "kind", "state");

-- CreateIndex
CREATE INDEX "ScoreSnapshot_leaderId_computedAt_idx" ON "ScoreSnapshot"("leaderId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_sourceUrl_key" ON "Transcript"("sourceUrl");

-- CreateIndex
CREATE INDEX "TranscriptChunk_transcriptId_idx_idx" ON "TranscriptChunk"("transcriptId", "idx");

-- AddForeignKey
ALTER TABLE "Affiliation" ADD CONSTRAINT "Affiliation_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affiliation" ADD CONSTRAINT "Affiliation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimVersion" ADD CONSTRAINT "ClaimVersion_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationVote" ADD CONSTRAINT "VerificationVote_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationVote" ADD CONSTRAINT "VerificationVote_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationVote" ADD CONSTRAINT "VerificationVote_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiteItem" ADD CONSTRAINT "BiteItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RightOfReply" ADD CONSTRAINT "RightOfReply_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RightOfReply" ADD CONSTRAINT "RightOfReply_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Takedown" ADD CONSTRAINT "Takedown_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbuseReport" ADD CONSTRAINT "AbuseReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSnapshot" ADD CONSTRAINT "ScoreSnapshot_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptChunk" ADD CONSTRAINT "TranscriptChunk_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
