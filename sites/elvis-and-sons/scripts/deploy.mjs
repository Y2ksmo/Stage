import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectName = "elvis-and-sons-site";
const blockedDomains = new Set(["elvisandsonsservices.com", "www.elvisandsonsservices.com"]);

const token = process.env.VERCEL_TOKEN ?? "";
const orgId = process.env.VERCEL_ORG_ID ?? "";
const dossierProjectId = process.env.DOSSIER_PROJECT_ID ?? "";
const presetProjectId = process.env.VERCEL_ELVIS_PROJECT_ID ?? "";

if (!token || !orgId) {
  console.error("VERCEL_TOKEN and VERCEL_ORG_ID are required. DNS was not changed.");
  process.exit(1);
}

const teamQuery = orgId.startsWith("team_") ? `teamId=${encodeURIComponent(orgId)}` : "";

async function vercel(path, init = {}) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamQuery) url.search = teamQuery;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

function projectIdOf(body) {
  return typeof body?.id === "string" ? body.id : "";
}

let projectId = presetProjectId;
if (!projectId) {
  const existing = await vercel(`/v9/projects/${encodeURIComponent(projectName)}`);
  if (existing.ok) {
    projectId = projectIdOf(existing.body);
  } else if (existing.status === 404 || existing.body?.error?.code === "not_found") {
    const created = await vercel("/v11/projects", {
      method: "POST",
      body: JSON.stringify({ name: projectName, framework: "nextjs" }),
    });
    if (!created.ok) {
      console.error(`Could not create the standalone Vercel project (${created.status}). DNS was not changed.`);
      process.exit(1);
    }
    projectId = projectIdOf(created.body);
  } else {
    console.error(`Could not look up the standalone Vercel project (${existing.status}). DNS was not changed.`);
    process.exit(1);
  }
}

if (!projectId || !projectId.startsWith("prj_")) {
  console.error("Standalone project id is missing. DNS was not changed.");
  process.exit(1);
}

if (dossierProjectId && projectId === dossierProjectId) {
  console.error("Refusing to deploy onto the dossier project. DNS was not changed.");
  process.exit(1);
}

const domains = await vercel(`/v9/projects/${projectId}/domains`);
if (!domains.ok) {
  console.error(`Could not confirm project domains (${domains.status}). DNS was not changed.`);
  process.exit(1);
}
const attached = Array.isArray(domains.body?.domains) ? domains.body.domains : [];
const live = attached.some((domain) => blockedDomains.has(String(domain?.name ?? "").toLowerCase()));
if (live) {
  console.error("elvisandsonsservices.com is already attached to this project. Refusing to deploy. DNS was not changed.");
  process.exit(1);
}

mkdirSync(resolve(siteRoot, ".vercel"), { recursive: true });
writeFileSync(
  resolve(siteRoot, ".vercel/project.json"),
  JSON.stringify({ orgId, projectId }),
);

const deploy = spawnSync(
  "vercel",
  ["deploy", "--prod", "--yes", "--token", token],
  {
    cwd: siteRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ORG_ID: orgId,
      VERCEL_PROJECT_ID: projectId,
    },
  },
);

const output = `${deploy.stdout ?? ""}\n${deploy.stderr ?? ""}`;
if (deploy.status !== 0) {
  const safe = output.replaceAll(token, "[redacted]");
  console.error(safe);
  console.error("Deploy failed. DNS was not changed.");
  process.exit(deploy.status ?? 1);
}

const urls = [...output.matchAll(/https:\/\/[^\s]+/g)].map((match) => match[0]);
const stable = urls.find((url) => url.includes(`${projectName}.vercel.app`)) ?? urls.at(-1) ?? "";
if (!stable) {
  console.error("Deploy finished without a URL. DNS was not changed.");
  process.exit(1);
}

console.log(stable);
