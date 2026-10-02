import { NextResponse } from "next/server";
import { getPublicIncident } from "../../../../../services/publicItems";

const DISCLAIMER =
  "Aggregated from cited public sources. Allegations are not findings of fact. This page is not a judgment on any faith or tradition.";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await getPublicIncident(id);
    if (!item) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    return NextResponse.json(
      { item, disclaimer: DISCLAIMER },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("public Incident fetch failed", error);
    return NextResponse.json({ error: "Interne serverfout." }, { status: 500 });
  }
}
