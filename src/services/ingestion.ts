import { prisma } from "../lib/prisma";
import { VerificationError } from "./verification";

export const EMBEDDING_DIM = 1536; // must match TranscriptChunk.embedding vector(1536)

export type EmbedFn = (text: string) => Promise<number[]>;

export interface IngestTranscriptParams {
  leaderId: string;
  sourceUrl: string;
  title?: string;
  platform?: string; // youtube, podcast, facebook…
  language?: string;
  fullText: string;
  publishedAt?: Date;
  chunkSize?: number; // words per chunk (default 300)
  overlap?: number; // words shared between consecutive chunks (default 50)
}

export interface SimilaritySearchResult {
  chunkId: string;
  transcriptId: string;
  leaderId: string;
  content: string;
  title: string | null;
  sourceUrl: string;
  chunkIndex: number;
  startSec: number | null;
  similarityScore: number;
}

/** Sliding word-window chunking. Always terminates; the final window is not duplicated as a tiny tail. */
export function chunkWords(text: string, chunkSize: number, overlap: number): string[] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new VerificationError("INVALID", "chunkSize must be a positive integer.");
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new VerificationError("INVALID", "overlap must be an integer >= 0 and < chunkSize.");
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  const step = chunkSize - overlap;
  for (let i = 0; i < words.length; i += step) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
    if (i + chunkSize >= words.length) break;
  }
  return chunks;
}

function toVectorLiteral(v: number[]): string {
  if (v.length !== EMBEDDING_DIM) {
    throw new VerificationError("INVALID", `Embedding must have ${EMBEDDING_DIM} dimensions (got ${v.length}).`);
  }
  if (!v.every(Number.isFinite)) throw new VerificationError("INVALID", "Embedding contains non-finite values.");
  return `[${v.join(",")}]`;
}

export class IngestionService {
  /**
   * Chunk a transcript, embed every chunk, then write transcript + chunks in ONE transaction.
   * Embeddings are computed first, so an embedding-provider failure leaves nothing half-written.
   * Re-ingesting the same sourceUrl for the same leader replaces its chunks (idempotent refresh).
   */
  static async ingestTranscript(params: IngestTranscriptParams, embed: EmbedFn) {
    const { leaderId, sourceUrl, fullText, chunkSize = 300, overlap = 50 } = params;
    if (!fullText?.trim()) throw new VerificationError("INVALID", "Transcript text cannot be empty.");
    try {
      new URL(sourceUrl);
    } catch {
      throw new VerificationError("INVALID", "sourceUrl must be a valid URL.");
    }

    const leader = await prisma.leader.findUnique({ where: { id: leaderId }, select: { id: true } });
    if (!leader) throw new VerificationError("NOT_FOUND", "Leader not found.");

    const chunks = chunkWords(fullText, chunkSize, overlap);
    const vectors: string[] = [];
    for (const c of chunks) vectors.push(toVectorLiteral(await embed(c)));

    return prisma.$transaction(
      async (tx) => {
        const existing = await tx.transcript.findUnique({ where: { sourceUrl } });
        if (existing && existing.leaderId !== leaderId) {
          throw new VerificationError("CONFLICT", "This source is already ingested for a different leader.");
        }
        const data = {
          title: params.title ?? null,
          platform: params.platform ?? "unknown",
          language: params.language ?? "en",
          publishedAt: params.publishedAt ?? null,
          fetchedAt: new Date(),
        };
        let transcript;
        if (existing) {
          await tx.transcriptChunk.deleteMany({ where: { transcriptId: existing.id } });
          transcript = await tx.transcript.update({ where: { id: existing.id }, data });
        } else {
          transcript = await tx.transcript.create({ data: { leaderId, sourceUrl, ...data } });
        }

        const chunkIds: string[] = [];
        for (let idx = 0; idx < chunks.length; idx++) {
          // Prisma can't write the pgvector column, so insert raw. Ids are cuid-like text.
          const rows = await tx.$queryRaw<Array<{ id: string }>>`
            INSERT INTO "TranscriptChunk" ("id", "transcriptId", "idx", "text", "embedding")
            VALUES (gen_random_uuid()::text, ${transcript.id}, ${idx}, ${chunks[idx]}, ${vectors[idx]}::vector)
            RETURNING "id"`;
          chunkIds.push(rows[0].id);
        }
        return { transcriptId: transcript.id, replaced: !!existing, chunksProcessed: chunkIds.length, chunkIds };
      },
      { timeout: 60_000 },
    );
  }

  /**
   * Cosine-similarity search. Orders by the raw distance operator so the HNSW index is usable
   * (ordering by a computed `1 - distance` alias defeats the index), then applies the threshold.
   */
  static async searchSimilarChunks(
    queryText: string,
    embed: EmbedFn,
    options: { leaderId?: string; limit?: number; minSimilarity?: number } = {},
  ): Promise<SimilaritySearchResult[]> {
    const { leaderId, minSimilarity = 0.7 } = options;
    const limit = Math.min(50, Math.max(1, Math.floor(options.limit ?? 5)));
    if (!queryText?.trim()) throw new VerificationError("INVALID", "Query text cannot be empty.");
    if (!(minSimilarity >= -1 && minSimilarity <= 1)) throw new VerificationError("INVALID", "minSimilarity must be between -1 and 1.");

    const q = toVectorLiteral(await embed(queryText));

    const rows = await prisma.$queryRaw<
      Array<{
        id: string; transcriptId: string; leaderId: string; text: string; title: string | null;
        sourceUrl: string; idx: number; startSec: number | null; similarity: number;
      }>
    >`
      SELECT * FROM (
        SELECT c."id", c."transcriptId", t."leaderId", c."text", t."title", t."sourceUrl",
               c."idx", c."startSec", 1 - (c."embedding" <=> ${q}::vector) AS similarity
        FROM "TranscriptChunk" c
        JOIN "Transcript" t ON t."id" = c."transcriptId"
        WHERE c."embedding" IS NOT NULL
          AND (${leaderId ?? null}::text IS NULL OR t."leaderId" = ${leaderId ?? null})
        ORDER BY c."embedding" <=> ${q}::vector
        LIMIT ${limit}
      ) ranked
      WHERE similarity >= ${minSimilarity}
      ORDER BY similarity DESC`;

    return rows.map((r) => ({
      chunkId: r.id,
      transcriptId: r.transcriptId,
      leaderId: r.leaderId,
      content: r.text,
      title: r.title,
      sourceUrl: r.sourceUrl,
      chunkIndex: r.idx,
      startSec: r.startSec,
      similarityScore: Number(Number(r.similarity).toFixed(4)),
    }));
  }
}
