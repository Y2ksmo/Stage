import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { SESSION_COOKIE, getAuthenticatedUserId } from "../src/lib/auth";
import { requestLogin } from "../src/lib/loginTokens";
import { setMailTransport } from "../src/services/notification";
import { getLoginEmail } from "../src/services/emailTemplates";
import { POST as requestRoute } from "../src/app/api/auth/login/request/route";
import { POST as verifyRoute } from "../src/app/api/auth/login/verify/route";

const env = process.env as Record<string, string | undefined>;
const SITE = "http://site.example";
const post = (h: (r: Request) => Promise<Response>, body: unknown, headers: Record<string, string> = { origin: SITE }) =>
  h(new Request(`${SITE}/api/x`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }));

async function main() {
  const tag = Date.now().toString();
  env.APP_BASE_URL = "https://pfpa.example";
  delete env.PFPA_DEV_USER_ID;
  const sent: Array<{ to: string; text: string; html?: string }> = [];
  setMailTransport(async (m) => { sent.push(m); });
  const last = () => sent[sent.length - 1];
  const codeOf = () => last().text.match(/Uw inlogcode: (\d{6})/)![1];
  const tokenOf = () => last().text.match(/staff\/login\?token=([A-Za-z0-9_-]+)/)![1];

  const mk = (n: string, role: "REVIEWER" | "EDITOR" | "CONTRIBUTOR" | "READER", extra: object = {}) => prisma.user.create({ data: { email: `${n}${tag}@Org.Example`, handle: `${n}${tag}`, role, ...extra } });
  const [staff, contributor, suspended] = await Promise.all([mk("st", "EDITOR"), mk("co", "CONTRIBUTOR"), mk("su", "REVIEWER", { suspendedUntil: new Date(Date.now() + 3600_000) })]);
  const staffEmail = `st${tag}@org.example`; // different case than stored: must still match

  // --- no account enumeration: identical responses; mail only for active staff ---
  const known = await post(requestRoute, { email: staffEmail });
  const unknown = await post(requestRoute, { email: `nobody${tag}@org.example` });
  const nonStaff = await post(requestRoute, { email: `co${tag}@org.example` });
  const susp = await post(requestRoute, { email: `su${tag}@org.example` });
  assert.equal(known.status, 200);
  for (const r of [unknown, nonStaff, susp]) { assert.equal(r.status, 200); }
  assert.deepEqual(await known.clone().json(), await unknown.json());
  assert.deepEqual(await nonStaff.json(), await susp.json());
  assert.equal(sent.length, 1, "only the active staff account is emailed");
  assert.equal(last().to, `st${tag}@Org.Example`);
  assert.equal((await post(requestRoute, { email: 123 })).status, 400);
  assert.equal((await post(requestRoute, { email: staffEmail }, {})).status, 403); // cross-site / no Origin

  // --- email content; nothing secret stored in plain text ---
  assert.match(last().text, /\d{6}/);
  assert.ok(last().html?.includes("Uw inlogcode"));
  assert.match(last().text, /^Uw inlogcode: \d{6}/);
  let row = await prisma.loginToken.findFirstOrThrow({ where: { userId: staff.id }, orderBy: { createdAt: "desc" } });
  assert.ok(!JSON.stringify(row).includes(codeOf()) && !JSON.stringify(row).includes(tokenOf()), "only keyed hashes are stored");
  assert.ok(row.expiresAt.getTime() - Date.now() <= 15 * 60_000 && row.expiresAt.getTime() > Date.now() + 14 * 60_000);

  // --- wrong code, wrong email, malformed: all the same 401 ---
  const wrong = codeOf() === "000000" ? "111111" : "000000";
  for (const body of [{ email: staffEmail, code: wrong }, { email: `nobody${tag}@org.example`, code: codeOf() }, { email: staffEmail, code: "12ab56" }, { email: staffEmail, code: "12345" }, { email: staffEmail }, {}]) {
    const r = await post(verifyRoute, body);
    assert.equal(r.status, 401);
    assert.equal(r.headers.get("set-cookie"), null);
  }
  assert.equal((await prisma.loginToken.findUniqueOrThrow({ where: { id: row.id } })).attempts, 1); // only the genuine wrong guess counted
  assert.equal((await post(verifyRoute, { email: staffEmail, code: codeOf() }, {})).status, 403); // needs same-origin

  // --- correct code: session cookie, usable, single use ---
  const ok = await post(verifyRoute, { email: staffEmail, code: codeOf() });
  assert.equal(ok.status, 200);
  const setCookie = ok.headers.get("set-cookie") ?? "";
  assert.match(setCookie, new RegExp(`^${SESSION_COOKIE}=`)); assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=strict/i);
  const sessionToken = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))![1];
  assert.equal(await getAuthenticatedUserId(new Request(SITE, { headers: { cookie: `${SESSION_COOKIE}=${sessionToken}` } })), staff.id);
  assert.equal((await post(verifyRoute, { email: staffEmail, code: codeOf() })).status, 401, "a used code cannot be replayed");
  assert.equal((await post(verifyRoute, { token: tokenOf() })).status, 401, "the link is dead too once the row is used");
  assert.equal(await prisma.moderationAction.count({ where: { actorId: staff.id, action: "STAFF_LOGIN" } }), 1);

  // --- magic link: works once ---
  await requestLogin(staffEmail);
  const link = tokenOf();
  assert.equal((await post(verifyRoute, { token: "x".repeat(43) })).status, 401);
  assert.equal((await post(verifyRoute, { token: link })).status, 200);
  assert.equal((await post(verifyRoute, { token: link })).status, 401);

  // --- brute force: 5 wrong guesses burn the code, even the right one then fails ---
  await requestLogin(staffEmail);
  const real = codeOf(); const bad = real === "123456" ? "654321" : "123456";
  for (let n = 0; n < 5; n++) assert.equal((await post(verifyRoute, { email: staffEmail, code: bad })).status, 401);
  assert.equal((await post(verifyRoute, { email: staffEmail, code: real })).status, 401);

  // --- a newer code cancels the older one ---
  await requestLogin(staffEmail); const oldCode = codeOf(); const oldLink = tokenOf();
  await requestLogin(staffEmail); const newCode = codeOf();
  assert.equal((await post(verifyRoute, { email: staffEmail, code: oldCode })).status, 401);
  assert.equal((await post(verifyRoute, { token: oldLink })).status, 401);
  assert.equal((await post(verifyRoute, { email: staffEmail, code: newCode })).status, 200);

  // (the hourly rate limit is exercised below; reset the counter so the next steps can request fresh codes)
  await prisma.loginToken.deleteMany({ where: { userId: staff.id } });

  // --- expiry ---
  await requestLogin(staffEmail);
  await prisma.loginToken.updateMany({ where: { userId: staff.id, usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await post(verifyRoute, { email: staffEmail, code: codeOf() })).status, 401);
  assert.equal((await post(verifyRoute, { token: tokenOf() })).status, 401);

  // --- race: the same valid code used twice at once logs in exactly once ---
  await requestLogin(staffEmail);
  const c = codeOf();
  const results = await Promise.all([1, 2, 3, 4].map(() => post(verifyRoute, { email: staffEmail, code: c })));
  assert.equal(results.filter((r) => r.status === 200).length, 1);

  // --- suspension between request and login blocks it ---
  await requestLogin(staffEmail);
  await prisma.user.update({ where: { id: staff.id }, data: { suspendedUntil: new Date(Date.now() + 3600_000) } });
  assert.equal((await post(verifyRoute, { email: staffEmail, code: codeOf() })).status, 401);
  await prisma.user.update({ where: { id: staff.id }, data: { suspendedUntil: null } });

  // --- rate limit: at most 5 codes per hour per account (generic response, no mail after that) ---
  await prisma.loginToken.deleteMany({ where: { userId: staff.id } });
  const before = sent.length;
  for (let n = 0; n < 8; n++) assert.equal((await post(requestRoute, { email: staffEmail })).status, 200);
  assert.equal(sent.length - before, 5);

  // --- email template guards ---
  assert.throws(() => getLoginEmail({ code: "12", linkUrl: "https://x.example", minutes: 15 }), /6 digits/);
  assert.throws(() => getLoginEmail({ code: "123456", linkUrl: "javascript:alert(1)", minutes: 15 }), /http\(s\)/);

  // --- production fails closed without AUTH_SECRET ---
  const nodeEnv = env.NODE_ENV; const secret = env.AUTH_SECRET;
  env.NODE_ENV = "production"; delete env.AUTH_SECRET;
  await assert.rejects(requestLogin(staffEmail), /AUTH_SECRET/);
  env.NODE_ENV = nodeEnv; if (secret) env.AUTH_SECRET = secret;
  void contributor; void suspended;
  console.log("EMAIL LOGIN TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
