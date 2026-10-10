import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectName = "elvis-and-sons-site";

const token = process.env.VERCEL_TOKEN ?? "";
const secretOrgId = process.env.VERCEL_ORG_ID ?? "";
const dossierProjectId = process.env.DOSSIER_PROJECT_ID ?? "";
const presetProjectId = process.env.VERCEL_ELVIS_PROJECT_ID ?? "";

if (!token || !secretOrgId) {
  console.error("VERCEL_TOKEN and VERCEL_ORG_ID are required. DNS was not changed.");
  process.exit(1);
}

function redact(text) {
  let safe = String(text ?? "");
  for (const secret of [token, secretOrgId, dossierProjectId]) {
    if (secret) safe = safe.split(secret).join("[redacted]");
  }
  return safe;
}

async function vercel(path, { method = "GET", body, teamId } = {}) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body: payload };
}

function shape(id) {
  if (!id) return "missing";
  if (id.startsWith("team_")) return "team";
  if (id.startsWith("prj_")) return "project";
  return "other";
}

const userResponse = await vercel("/v2/user");
const userId = userResponse.body?.user?.id ?? "";
const teamsResponse = userResponse.ok ? await vercel("/v2/teams") : { ok: false, status: 0, body: {} };
const fallbackTeams = teamsResponse.ok ? teamsResponse : await vercel("/v1/teams");
const teams = (Array.isArray(fallbackTeams.body?.teams) ? fallbackTeams.body.teams : [])
  .map((team) => ({ id: String(team?.id ?? ""), slug: String(team?.slug ?? "") }))
  .filter((team) => team.id.startsWith("team_"));

console.error(
  `token user: ${userResponse.ok ? "yes" : "no"} (${userResponse.status}); secret org shape: ${shape(secretOrgId)}; secret org is token user: ${Boolean(userId) && secretOrgId === userId ? "yes" : "no"}; teams visible: ${teams.length}`,
);

async function cliCanResolve(orgId) {
  if (!orgId) return false;
  if (orgId.startsWith("team_")) {
    if (teams.some((team) => team.id === orgId)) return true;
    const team = await vercel(`/teams/${encodeURIComponent(orgId)}`);
    return team.ok && team.body?.id === orgId;
  }
  return Boolean(userId) && orgId === userId;
}

const searchScopes = [];
function addScope(teamId) {
  const key = teamId ?? "";
  if (searchScopes.some((scope) => scope.teamId === key)) return;
  searchScopes.push({ teamId: key });
}
addScope("");
if (userId) addScope(userId.startsWith("team_") ? userId : "");
for (const team of teams) addScope(team.id);
if (secretOrgId.startsWith("team_")) addScope(secretOrgId);

async function findByName(teamId) {
  const found = await vercel(`/v9/projects/${encodeURIComponent(projectName)}`, { teamId: teamId || undefined });
  if (!found.ok || found.body?.name !== projectName || !String(found.body?.id ?? "").startsWith("prj_")) return null;
  return found.body;
}

let project = null;
if (presetProjectId) {
  for (const scope of searchScopes) {
    const found = await vercel(`/v9/projects/${encodeURIComponent(presetProjectId)}`, { teamId: scope.teamId || undefined });
    if (found.ok && found.body?.id === presetProjectId) {
      project = found.body;
      break;
    }
  }
  if (!project) {
    console.error("VERCEL_ELVIS_PROJECT_ID is not visible to this token. DNS was not changed.");
    process.exit(1);
  }
} else {
  for (const scope of searchScopes) {
    project = await findByName(scope.teamId);
    if (project) break;
  }
}

const preferredTeamId = secretOrgId.startsWith("team_") && (await cliCanResolve(secretOrgId)) ? secretOrgId : undefined;

if (!project) {
  let created = await vercel("/v11/projects", {
    method: "POST",
    teamId: preferredTeamId,
    body: { name: projectName, framework: "nextjs" },
  });
  if (!created.ok && !preferredTeamId && teams[0]?.id) {
    created = await vercel("/v11/projects", {
      method: "POST",
      teamId: teams[0].id,
      body: { name: projectName, framework: "nextjs" },
    });
  }
  if (!created.ok || created.body?.name !== projectName) {
    console.error(`Could not create the standalone Vercel project (${created.status}). DNS was not changed.`);
    process.exit(1);
  }
  project = created.body;
  console.error("created standalone project: yes");
} else {
  console.error("found existing standalone project: yes");
}

const projectId = String(project.id ?? "");
const accountId = String(project.accountId ?? preferredTeamId ?? userId ?? "");
if (!projectId.startsWith("prj_") || project.name !== projectName) {
  console.error("Standalone project payload was not usable. DNS was not changed.");
  process.exit(1);
}
if (dossierProjectId && projectId === dossierProjectId) {
  console.error("Refusing to deploy onto the dossier project. DNS was not changed.");
  process.exit(1);
}
if (!(await cliCanResolve(accountId))) {
  console.error(
    `Standalone project owner is not resolvable by the Vercel CLI (owner shape: ${shape(accountId)}). DNS was not changed.`,
  );
  process.exit(1);
}

const teamId = accountId.startsWith("team_") ? accountId : undefined;
const confirmed = await vercel(`/v9/projects/${projectId}`, { teamId });
if (!confirmed.ok || confirmed.body?.id !== projectId) {
  console.error(`Could not re-read the standalone project (${confirmed.status}). DNS was not changed.`);
  process.exit(1);
}

const domains = await vercel(`/v9/projects/${projectId}/domains`, { teamId });
if (!domains.ok) {
  console.error(`Could not confirm project domains (${domains.status}). DNS was not changed.`);
  process.exit(1);
}
const attached = Array.isArray(domains.body?.domains) ? domains.body.domains : [];

console.error(
  `deploy owner shape: ${shape(accountId)}; owner matches secret org: ${accountId === secretOrgId ? "yes" : "no"}; dossier project: no`,
);

mkdirSync(resolve(siteRoot, ".vercel"), { recursive: true });
writeFileSync(resolve(siteRoot, ".vercel/project.json"), JSON.stringify({ orgId: accountId, projectId }));

const deploy = spawnSync("vercel", ["deploy", "--prod", "--yes", "--token", token], {
  cwd: siteRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    VERCEL_ORG_ID: accountId,
    VERCEL_PROJECT_ID: projectId,
  },
});

const output = redact(`${deploy.stdout ?? ""}\n${deploy.stderr ?? ""}`);
if (deploy.status !== 0) {
  console.error(output);
  console.error("Deploy failed. DNS was not changed.");
  process.exit(deploy.status ?? 1);
}

const publicDomains = [
  { name: "elvisandsonsservices.com" },
  { name: "www.elvisandsonsservices.com", redirect: "elvisandsonsservices.com", redirectStatusCode: 308 },
];

function domainNames(list) {
  return new Set(list.map((domain) => String(domain?.name ?? "").toLowerCase()));
}

let knownDomains = domainNames(attached);

for (const spec of publicDomains) {
  if (knownDomains.has(spec.name)) {
    console.error(`domain already on this project: ${spec.name}`);
    continue;
  }
  let created = await vercel(`/v10/projects/${projectId}/domains`, { method: "POST", teamId, body: spec });
  if (!created.ok && spec.redirect) {
    created = await vercel(`/v10/projects/${projectId}/domains`, {
      method: "POST",
      teamId,
      body: { name: spec.name },
    });
  }
  if (created.ok) {
    knownDomains.add(spec.name);
    console.error(`attached domain: ${spec.name}`);
    continue;
  }
  const code = String(created.body?.error?.code ?? "");
  const owner = String(created.body?.error?.projectId ?? "");
  if (owner && owner === projectId) {
    knownDomains.add(spec.name);
    console.error(`domain already on this project: ${spec.name}`);
    continue;
  }
  if (dossierProjectId && owner === dossierProjectId) {
    console.error("The public domain is attached to the dossier project. Refusing to move it. Namecheap was not modified.");
    process.exit(1);
  }
  console.error(`Could not attach ${spec.name} (${created.status} ${code}). Namecheap was not modified.`);
  process.exit(1);
}

const domainConfig = await vercel("/v6/domains/elvisandsonsservices.com/config", { teamId });
const ipv4 = [];
for (const item of domainConfig.body?.recommendedIPv4 ?? []) {
  const values = Array.isArray(item?.value) ? item.value : [item?.value];
  for (const value of values) if (value) ipv4.push(String(value));
}
const cnames = [];
for (const item of domainConfig.body?.recommendedCNAME ?? []) {
  if (item?.value) cnames.push(String(item.value));
}
const summary = [
  "Public domain attached on the Elvis Vercel project only.",
  "Namecheap was not modified.",
  `Recommended A record for @: ${ipv4.join(", ") || "unavailable"}`,
  `Recommended CNAME: ${cnames.join(", ") || "unavailable"}`,
  "Leave MX and TXT records for privateemail.com unchanged.",
].join("\n");
console.error(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, { flag: "a" });
}

const urls = [...output.matchAll(/https:\/\/[^\s]+/g)].map((match) => match[0]);
const stable = urls.find((url) => url.includes(`${projectName}.vercel.app`)) ?? urls.at(-1) ?? "";
if (!stable) {
  console.error(output);
  console.error("Deploy finished without a URL. DNS was not changed.");
  process.exit(1);
}

console.log(stable);
