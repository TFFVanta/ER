import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolingRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolingRoot, "..");
const distRoot = path.join(repoRoot, "dist");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

if (!fs.existsSync(distRoot)) {
  throw new Error("dist directory not found. Run the Vite build before generating portal artifacts.");
}

const commitSha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "local";
const builtAt = new Date().toISOString();
const hosts = [
  "mingo.center",
  "www.mingo.center",
  "portal.mingo.center",
  "ops.mingo.center",
  "api.mingo.center",
  "status.mingo.center",
  "docs.mingo.center",
];

const healthPayload = {
  ok: true,
  service: "mingo-center-frontend",
  product: "Mingo public frontend",
  platform: "EXOTIC",
  intelligence: "VENUS",
  operator: "Lucian",
  version: packageJson.version,
  commitSha,
  builtAt,
};

const deploymentManifest = {
  generatedAt: builtAt,
  version: packageJson.version,
  commitSha,
  canonicalHost: "mingo.center",
  reservedHosts: hosts,
  deploymentModes: ["ssh-atomic", "ssh-static", "vps-atomic", "manual-hold"],
};

fs.writeFileSync(path.join(distRoot, "healthz.json"), `${JSON.stringify(healthPayload, null, 2)}\n`);
fs.writeFileSync(
  path.join(distRoot, "deployment-manifest.json"),
  `${JSON.stringify(deploymentManifest, null, 2)}\n`,
);

console.log(`Portal artifacts generated in ${distRoot}`);
