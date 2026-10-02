import { prisma } from "../lib/prisma";

/**
 * Public discovery: home-page lists and search.
 *
 * Rules (kept here so every entry point behaves the same):
 *  - Only VERIFIED / DISPUTED items are ever visible.
 *  - A leader is LISTED (home, search) only if they have at least one public item. A name with no
 *    evidence behind it is never surfaced; the direct profile URL still works.
 *  - Selection is neutral: recency of verified activity or text match. Never ranked by risk score.
 *  - Disputed items are searchable (with a flag) but never promoted on the home page.
 */

const PUBLIC_STATES = ["VERIFIED", "DISPUTED"] as const;
const MIN_QUERY = 2;
const MAX_QUERY = 100;

const excerpt = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n)}…` : s);

export interface ListedLeader { id: string; slug: string; displayName: string; tradition: string | null; country: string | null; publicItems: number }
export interface RecentItem { type: "CLAIM" | "INCIDENT"; id: string; title: string; leaderName: string; leaderSlug: string; at: Date }

/** Leaders with the most recent VERIFIED activity (neutral, recency-based). */
export async function getRecentLeaders(limit = 6): Promise<ListedLeader[]> {
  const [c, i] = await Promise.all([
    prisma.claim.groupBy({ by: ["leaderId"], where: { state: "VERIFIED" }, _max: { updatedAt: true } }),
    prisma.incident.groupBy({ by: ["leaderId"], where: { state: "VERIFIED" }, _max: { updatedAt: true } }),
  ]);
  const latest = new Map<string, number>();
  for (const g of [...c, ...i]) {
    const t = g._max.updatedAt?.getTime() ?? 0;
    latest.set(g.leaderId, Math.max(latest.get(g.leaderId) ?? 0, t));
  }
  const ids = [...latest.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  return hydrateLeaders(ids);
}

async function hydrateLeaders(ids: string[]): Promise<ListedLeader[]> {
  if (ids.length === 0) return [];
  const [leaders, claimCounts, incidentCounts] = await Promise.all([
    prisma.leader.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, displayName: true, tradition: true, country: true } }),
    prisma.claim.groupBy({ by: ["leaderId"], where: { leaderId: { in: ids }, state: { in: [...PUBLIC_STATES] } }, _count: { _all: true } }),
    prisma.incident.groupBy({ by: ["leaderId"], where: { leaderId: { in: ids }, state: { in: [...PUBLIC_STATES] } }, _count: { _all: true } }),
  ]);
  const count = new Map<string, number>();
  for (const g of [...claimCounts, ...incidentCounts]) count.set(g.leaderId, (count.get(g.leaderId) ?? 0) + g._count._all);
  const byId = new Map(leaders.map((l) => [l.id, l]));
  return ids.flatMap((id) => {
    const l = byId.get(id);
    return l ? [{ ...l, publicItems: count.get(id) ?? 0 }] : [];
  });
}

/** Most recently verified items. Disputed items are deliberately excluded from promotion. */
export async function getRecentPublicItems(limit = 5): Promise<RecentItem[]> {
  const [claims, incidents] = await Promise.all([
    prisma.claim.findMany({ where: { state: "VERIFIED" }, orderBy: { updatedAt: "desc" }, take: limit, select: { id: true, statementText: true, updatedAt: true, leader: { select: { displayName: true, slug: true } } } }),
    prisma.incident.findMany({ where: { state: "VERIFIED" }, orderBy: { updatedAt: "desc" }, take: limit, select: { id: true, title: true, updatedAt: true, leader: { select: { displayName: true, slug: true } } } }),
  ]);
  return [
    ...claims.map((c): RecentItem => ({ type: "CLAIM", id: c.id, title: excerpt(c.statementText), leaderName: c.leader.displayName, leaderSlug: c.leader.slug, at: c.updatedAt })),
    ...incidents.map((i): RecentItem => ({ type: "INCIDENT", id: i.id, title: i.title, leaderName: i.leader.displayName, leaderSlug: i.leader.slug, at: i.updatedAt })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export interface SearchResults {
  query: string;
  tooShort: boolean;
  leaders: ListedLeader[];
  claims: Array<{ id: string; title: string; leaderName: string; leaderSlug: string; disputed: boolean }>;
  incidents: Array<{ id: string; title: string; leaderName: string; leaderSlug: string; disputed: boolean }>;
}

/** LIKE wildcards in user input must match literally, not widen the search. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export async function searchPublic(raw: string, limit = 20): Promise<SearchResults> {
  const query = raw.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY);
  const empty = { query, tooShort: query.length < MIN_QUERY, leaders: [], claims: [], incidents: [] };
  if (query.length < MIN_QUERY) return empty;

  const q = escapeLike(query);
  const contains = { contains: q, mode: "insensitive" as const };
  const publicState = { state: { in: [...PUBLIC_STATES] } };

  const [leaderRows, claims, incidents] = await Promise.all([
    prisma.leader.findMany({
      where: {
        AND: [
          { OR: [{ displayName: contains }, { slug: contains }, { aliases: { has: query } }] },
          // listed only if something public stands behind the name
          { OR: [{ claims: { some: publicState } }, { incidents: { some: publicState } }] },
        ],
      },
      orderBy: { displayName: "asc" }, take: 10, select: { id: true },
    }),
    prisma.claim.findMany({
      where: { ...publicState, OR: [{ statementText: contains }, { summary: contains }] },
      orderBy: { updatedAt: "desc" }, take: limit,
      select: { id: true, statementText: true, state: true, leader: { select: { displayName: true, slug: true } } },
    }),
    prisma.incident.findMany({
      where: { ...publicState, OR: [{ title: contains }, { description: contains }] },
      orderBy: { updatedAt: "desc" }, take: limit,
      select: { id: true, title: true, state: true, leader: { select: { displayName: true, slug: true } } },
    }),
  ]);

  return {
    query,
    tooShort: false,
    leaders: await hydrateLeaders(leaderRows.map((l) => l.id)),
    claims: claims.map((c) => ({ id: c.id, title: excerpt(c.statementText), leaderName: c.leader.displayName, leaderSlug: c.leader.slug, disputed: c.state === "DISPUTED" })),
    incidents: incidents.map((i) => ({ id: i.id, title: i.title, leaderName: i.leader.displayName, leaderSlug: i.leader.slug, disputed: i.state === "DISPUTED" })),
  };
}
