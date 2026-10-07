import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const officialHosts = new Set(["elvisandsonsservices.com", "www.elvisandsonsservices.com"]);

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const response = NextResponse.next();
  if (!officialHosts.has(host)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
