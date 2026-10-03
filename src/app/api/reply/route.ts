import { NextResponse } from "next/server";
import { errorResponse, readJson } from "../../../lib/http";
import { recordSubjectReply } from "../../../services/rightOfReply";

/** Public endpoint, authorised by the one-time token from the right-of-reply notice. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  const { token, action, replyText, evidenceUrls } = body;
  if (
    typeof token !== "string" || (action !== "ACCEPT" && action !== "DECLINE") ||
    (replyText !== undefined && typeof replyText !== "string") ||
    (evidenceUrls !== undefined && (!Array.isArray(evidenceUrls) || evidenceUrls.some((u) => typeof u !== "string")))
  ) {
    return NextResponse.json({ error: "Verplichte velden: token, action (ACCEPT of DECLINE)." }, { status: 400 });
  }
  try {
    const result = await recordSubjectReply({
      token, action, replyText: replyText as string | undefined, evidenceUrls: evidenceUrls as string[] | undefined,
    });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    return errorResponse(e, "record subject reply failed");
  }
}
