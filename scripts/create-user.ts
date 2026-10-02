// Usage: npm run user:create -- <email> <ROLE> [handle]
// Creates (or updates the role of) a user. Staff roles can then log in with an emailed code.
import { prisma } from "../src/lib/prisma";

const ROLES = ["READER", "CONTRIBUTOR", "REVIEWER", "EDITOR", "LEGAL", "ADMIN"] as const;
type R = (typeof ROLES)[number];

async function main() {
  const [emailRaw, roleRaw, handleArg] = process.argv.slice(2);
  const email = emailRaw?.trim().toLowerCase();
  const role = roleRaw?.toUpperCase() as R;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ROLES.includes(role)) {
    throw new Error(`Usage: npm run user:create -- <email> <${ROLES.join("|")}> [handle]`);
  }
  const handle = handleArg ?? `${email.split("@")[0].replace(/[^a-z0-9]/g, "").slice(0, 20)}${Math.random().toString(36).slice(2, 6)}`;
  const user = await prisma.user.upsert({ where: { email }, update: { role }, create: { email, handle, role }, select: { id: true, email: true, role: true, handle: true } });
  console.log(`${user.email}: role ${user.role} (id ${user.id}, handle ${user.handle})`);
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
