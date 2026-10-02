import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { IngestionService, chunkWords, EMBEDDING_DIM } from "../src/services/ingestion";

// Deterministic bag-of-words embedding (hash words into 1536 buckets, L2-normalised). Test double only.
const embed = async (text: string) => {
  const v = new Array(EMBEDDING_DIM).fill(0);
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    let h = 0;
    for (const ch of w) h = (h * 31 + ch.charCodeAt(0)) % EMBEDDING_DIM;
    v[h] += 1;
  }
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
};

async function main() {
  // chunking: terminates, overlaps, bad params rejected
  const words = Array.from({ length: 10 }, (_, i) => `w${i}`).join(" ");
  assert.deepEqual(chunkWords(words, 4, 1), ["w0 w1 w2 w3", "w3 w4 w5 w6", "w6 w7 w8 w9"]);
  assert.throws(() => chunkWords(words, 4, 4), /overlap/); // would loop forever in the naive version
  assert.equal(chunkWords("one", 300, 50).length, 1);

  const tag = Date.now().toString();
  const mk = (n: string) => prisma.leader.create({ data: { slug: `${n}${tag}`, displayName: n, aliases: [], publicProfileUrls: [] } });
  const [a, b] = await Promise.all([mk("a"), mk("b")]);
  const url = (n: string) => `https://video.example/${n}${tag}`;

  const rainy = "the rain will fall on the harvest and the flood will come to the valley next spring ".repeat(5);
  const money = "give your seed offering money now to receive blessings donate tithe wealth prosperity ".repeat(5);
  const r1 = await IngestionService.ingestTranscript({ leaderId: a.id, sourceUrl: url("rain"), title: "Rain", fullText: rainy, chunkSize: 30, overlap: 5 }, embed);
  await IngestionService.ingestTranscript({ leaderId: a.id, sourceUrl: url("money"), title: "Money", fullText: money, chunkSize: 30, overlap: 5 }, embed);
  await IngestionService.ingestTranscript({ leaderId: b.id, sourceUrl: url("other"), title: "Other", fullText: rainy, chunkSize: 30, overlap: 5 }, embed);
  assert.ok(r1.chunksProcessed > 1);

  // semantic search: nearest chunk comes from the matching transcript, leader filter works
  const hits = await IngestionService.searchSimilarChunks("flood coming to the valley", embed, { leaderId: a.id, limit: 3, minSimilarity: 0.1 });
  assert.ok(hits.length > 0);
  assert.equal(hits[0].title, "Rain");
  assert.ok(hits.every((h) => h.leaderId === a.id));
  assert.ok(hits[0].similarityScore >= hits[hits.length - 1].similarityScore);
  assert.equal((await IngestionService.searchSimilarChunks("flood valley", embed, { leaderId: a.id, minSimilarity: 0.999 })).length, 0);

  // re-ingest replaces chunks; other leader cannot claim the same source
  const again = await IngestionService.ingestTranscript({ leaderId: a.id, sourceUrl: url("rain"), title: "Rain v2", fullText: rainy, chunkSize: 30, overlap: 5 }, embed);
  assert.equal(again.replaced, true);
  const t = await prisma.transcript.findUniqueOrThrow({ where: { sourceUrl: url("rain") } });
  assert.equal(await prisma.transcriptChunk.count({ where: { transcriptId: t.id } }), again.chunksProcessed);
  await assert.rejects(IngestionService.ingestTranscript({ leaderId: b.id, sourceUrl: url("rain"), fullText: rainy }, embed), /different leader/);

  // validation: dimension, empty text, unknown leader
  await assert.rejects(IngestionService.ingestTranscript({ leaderId: a.id, sourceUrl: url("bad"), fullText: "x y z" }, async () => [1, 2, 3]), /1536/);
  assert.equal(await prisma.transcript.count({ where: { sourceUrl: url("bad") } }), 0); // nothing half-written
  await assert.rejects(IngestionService.ingestTranscript({ leaderId: a.id, sourceUrl: url("e"), fullText: "  " }, embed), /empty/);
  await assert.rejects(IngestionService.ingestTranscript({ leaderId: "nope", sourceUrl: url("n"), fullText: "x" }, embed), /not found/);

  // the query shape can use the HNSW index
  const plan = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL enable_seqscan = off");
    const q = `[${(await embed("flood")).join(",")}]`;
    return tx.$queryRawUnsafe<Array<Record<string, string>>>(`EXPLAIN SELECT id FROM "TranscriptChunk" ORDER BY embedding <=> '${q}'::vector LIMIT 5`);
  });
  assert.ok(plan.map((r) => Object.values(r)[0]).join("\n").includes("hnsw"), "HNSW index should be used");
  console.log("INGESTION TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
