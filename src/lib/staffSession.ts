import { cookies } from "next/headers";
import { SESSION_COOKIE, resolveSessionToken } from "./auth";

/** For server components: the logged-in user (from the HttpOnly session cookie), or null. cookies() is async in this Next.js version. */
export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? resolveSessionToken(token) : null;
}
