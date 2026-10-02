/**
 * Fail when prisma/schema.prisma enums and src/domain/enums.ts drift.
 * Usage: node scripts/check-enum-sync.mjs
 */
import fs from "node:fs";

const schema = fs.readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const ts = fs.readFileSync(new URL("../src/domain/enums.ts", import.meta.url), "utf8");

function prismaEnums(src) {
  const enums = new Map();
  const re = /enum\s+(\w+)\s*\{([^}]*)\}/g;
  for (const match of src.matchAll(re)) {
    const values = [];
    for (const line of match[2].split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) continue;
      const name = trimmed.split(/[\s/]/)[0];
      if (name) values.push(name);
    }
    enums.set(match[1], values);
  }
  return enums;
}

function tsEnums(src) {
  const enums = new Map();
  const re = /export const (\w+) = \{([^}]*)\} as const;/g;
  for (const match of src.matchAll(re)) {
    const values = [];
    for (const line of match[2].split("\n")) {
      const key = line.trim().match(/^(\w+)\s*:/);
      if (key) values.push(key[1]);
    }
    enums.set(match[1], values);
  }
  return enums;
}

const prisma = prismaEnums(schema);
const typescript = tsEnums(ts);
const errors = [];

for (const [name, values] of prisma) {
  const tsValues = typescript.get(name);
  if (!tsValues) {
    errors.push(`missing TypeScript enum ${name}`);
    continue;
  }
  if (values.join(",") !== tsValues.join(",")) {
    errors.push(
      `${name} mismatch\n  prisma: ${values.join(", ")}\n  ts:     ${tsValues.join(", ")}`,
    );
  }
}

for (const name of typescript.keys()) {
  if (!prisma.has(name)) errors.push(`TypeScript enum ${name} is not in the Prisma schema`);
}

if (prisma.size === 0 || typescript.size === 0) {
  errors.push("parser found no enums; the check is not covering the schema");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`enum sync ok (${prisma.size} enums)`);
