import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { latestScore } from "../../../../../services/scoring";

const DISCLAIMER =
  "Aggregated from cited public sources under a published methodology. Allegations are not findings of fact. " +
  "This score is not a judgment on any faith or tradition.";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const leader = await prisma.leader.findUnique({
      where: { id },
      select: { id: true, slug: true, displayName: true, status: true },
    });
    if (!leader) return NextResponse.json({ error: "Leider niet gevonden." }, { status: 404 });

    const snap = await latestScore(prisma, id);

    // No snapshot yet is a valid public state ("insufficient data"), not an error.
    const score = snap
      ? {
          riskScore: snap.riskScore, // null => insufficient data, show no number
          band: snap.band,
          confidence: snap.confidence,
          dimensions: snap.dimensions,
          methodologyVersion: snap.methodologyVersion,
          computedAt: snap.computedAt,
        }
      : {
          riskScore: null,
          band: "INSUFFICIENT_DATA",
          confidence: 0,
          dimensions: [],
          methodologyVersion: null,
          computedAt: null,
        };

    return NextResponse.json(
      { leader, score, disclaimer: DISCLAIMER },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Fout bij ophalen risicoscore:", error);
    return NextResponse.json({ error: "Interne serverfout bij ophalen risicoscore." }, { status: 500 });
  }
}
