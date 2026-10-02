/**
 * Resolve the authenticated user from the request. FAILS CLOSED: until a real auth provider
 * (NextAuth/Clerk/session cookie) is wired in here, no request is authenticated in production.
 * The reviewer identity must NEVER be taken from the request body.
 */
export async function getAuthenticatedUserId(_request: Request): Promise<string | null> {
  if (process.env.NODE_ENV !== "production" && process.env.PFPA_DEV_USER_ID) {
    return process.env.PFPA_DEV_USER_ID; // local development only
  }
  return null; // TODO: replace with real session lookup
}
