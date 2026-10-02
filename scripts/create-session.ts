// Usage: npm run session:create -- <userId or email> [ttlHours]
// Prints a bearer token ONCE. Use as:  Authorization: Bearer <token>
import { prisma } from "../src/lib/prisma";
import { createSession } from "../src/lib/auth";

async function main() {
  const [who, ttl] = process.argv.slice(2);
  if (!who) throw new Error("Usage: npm run session:create -- <userId|email> [ttlHours]");
  const user = await prisma.user.findFirst({ where: { OR: [{ id: who }, { email: who }] }, select: { id: true, email: true, role: true } });
  if (!user) throw new Error(`No user found for "${who}".`);
  const { token, expiresAt } = await createSession(user.id, ttl ? Number(ttl) : undefined);
  console.log(`User: ${user.email} (${user.role})\nExpires: ${expiresAt.toISOString()}\nToken (shown once): ${token}`);
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
