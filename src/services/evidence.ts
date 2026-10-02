import type { EvidenceKind, SourceTier } from "@prisma/client";

export interface EvidenceLite {
  tier: SourceTier;
  kind: EvidenceKind;
  publisherKey: string;
  ownershipGroup: string | null;
  archiveUrl: string | null;
  sha256: string | null;
}

/** Independent = distinct ownership group (else publisher), archived+hashed, not social/screenshot. */
export function countIndependentSources(evidence: EvidenceLite[]) {
  const counted = evidence.filter(
    (e) => e.tier !== "SOCIAL" && e.kind !== "SCREENSHOT" && e.archiveUrl && e.sha256,
  );
  const groups = new Map<string, SourceTier[]>();
  for (const e of counted) {
    const k = (e.ownershipGroup ?? e.publisherKey).toLowerCase();
    groups.set(k, [...(groups.get(k) ?? []), e.tier]);
  }
  return {
    independent: groups.size,
    hasStrong: [...groups.values()].some((t) => t.some((x) => x === "PRIMARY" || x === "TIER1_MEDIA")),
  };
}
