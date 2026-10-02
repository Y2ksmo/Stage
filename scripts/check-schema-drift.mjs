// Fails when prisma/schema.prisma and the migrated database differ, so a schema change can never ship without a migration.
// Prisma cannot see the pgvector HNSW index (created in raw SQL), so that single known line is allowed.
import { execFileSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (point it at a database where migrations were applied).");
  process.exit(2);
}
const out = execFileSync("npx", ["prisma", "migrate", "diff", "--from-url", url, "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8" });
const ALLOWED = [/^DROP INDEX "TranscriptChunk_embedding_hnsw";$/];
const extra = out.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("--")).filter((l) => !ALLOWED.some((re) => re.test(l)));
if (extra.length > 0) {
  console.error("Schema drift: the schema differs from the migrations. Create a migration for:\n" + extra.join("\n"));
  process.exit(1);
}
console.log("No schema drift.");
