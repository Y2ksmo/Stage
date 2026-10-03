ALTER TABLE "VerificationVote" ADD CONSTRAINT one_target CHECK (num_nonnulls("claimId","incidentId") = 1);
ALTER TABLE "Evidence" ADD CONSTRAINT one_parent CHECK (num_nonnulls("claimId","incidentId","reviewId") = 1);
CREATE INDEX "TranscriptChunk_embedding_hnsw" ON "TranscriptChunk" USING hnsw (embedding vector_cosine_ops);
