import { NextResponse } from "next/server";
import { getPublicLeaderProfile } from "../../../../../services/publicLeaders";

const DISCLAIMER =
  "Aggregated from cited public sources under a published methodology. Allegations are not findings of fact. This page is not a judgment on any faith or tradition.";

const int = (v: string | null) => (v !== null && /^\d{1,6}$/.test(v) ? Number(v) : undefined);

/** Public profile by id or slug. Optional ?limit= (max 100) and ?offset= paginate the claim and incident lists. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const profile = await getPublicLeaderProfile(id, { limit: int(url.searchParams.get("limit")), offset: int(url.searchParams.get("offset")) });
    if (!profile) return NextResponse.json({ error: "Leider niet gevonden." }, { status: 404 });
    return NextResponse.json(
      { ...profile, disclaimer: DISCLAIMER },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("public leader profile failed", error);
    return NextResponse.json({ error: "Interne serverfout." }, { status: 500 });
  }
}
