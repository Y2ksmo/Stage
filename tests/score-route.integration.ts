import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { GET } from "../src/app/api/leaders/[id]/score/route";
import { recomputeLeaderScore } from "../src/services/scoring";

const get = (id: string) => GET(new Request("http://x"), { params: Promise.resolve({ id }) });

async function main() {
  const tag = Date.now().toString();
  const leader = await prisma.leader.create({ data: { slug: `s${tag}`, displayName: "Score Leader", aliases: [], publicProfileUrls: [] } });
  assert.equal((await get("missing")).status, 404);
  let body = await (await get(leader.id)).json();
  assert.equal(body.score.band, "INSUFFICIENT_DATA");
  assert.equal(body.score.riskScore, null);
  await recomputeLeaderScore(prisma, leader.id);
  const res = await get(leader.id);
  body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.leader.displayName, "Score Leader");
  assert.equal(body.score.methodologyVersion, "1.0.0");
  assert.ok(body.disclaimer);
  console.log("SCORE ROUTE TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
