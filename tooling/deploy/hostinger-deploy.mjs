import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolingRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolingRoot, "../..");
const distRoot = path.join(repoRoot, "dist");

if (!fs.existsSync(distRoot)) {
  throw new Error("dist directory not found. Run npm run portal:build before deploying.");
}

const mode = process.env.HOSTINGER_DEPLOYMENT_MODE || "manual-hold";
const sshHost = process.env.HOSTINGER_SSH_HOST;
const sshPort = process.env.HOSTINGER_SSH_PORT || "22";
const sshUser = process.env.HOSTINGER_SSH_USER;
const deploymentRoot = process.env.HOSTINGER_DEPLOYMENT_ROOT;
const webRoot = process.env.HOSTINGER_WEB_ROOT;
const releaseId = process.env.RELEASE_ID || process.env.GITHUB_SHA || `local-${Date.now()}`;

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required deployment environment variable: ${name}`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function prepareSshKey() {
  const key = process.env.HOSTINGER_SSH_PRIVATE_KEY;
  required("HOSTINGER_SSH_PRIVATE_KEY", key);

  const sshDir = fs.mkdtempSync(path.join(os.tmpdir(), "exotic-hostinger-"));
  const keyPath = path.join(sshDir, "id_ed25519");
  fs.writeFileSync(keyPath, `${key.trim()}\n`, { mode: 0o600 });

  let knownHostsPath;
  const knownHosts = process.env.HOSTINGER_SSH_KNOWN_HOSTS;
  if (knownHosts) {
    knownHostsPath = path.join(sshDir, "known_hosts");
    fs.writeFileSync(knownHostsPath, `${knownHosts.trim()}\n`, { mode: 0o600 });
  }

  return { sshDir, keyPath, knownHostsPath };
}

function sshArgs(keyPath, knownHostsPath) {
  // Prefer a pinned known_hosts (verified) over blind trust-on-first-use, but never
  // fall all the way to StrictHostKeyChecking=no — that accepts silent MITM.
  const hostKeyOpts = knownHostsPath
    ? ["-o", `UserKnownHostsFile=${knownHostsPath}`, "-o", "StrictHostKeyChecking=yes"]
    : ["-o", "StrictHostKeyChecking=accept-new"];
  return ["-i", keyPath, "-p", sshPort, ...hostKeyOpts];
}

function createArchive() {
  const archivePath = path.join(os.tmpdir(), `mingo-frontend-${releaseId}.tar.gz`);
  run("tar", ["-czf", archivePath, "-C", distRoot, "."]);
  return archivePath;
}

function deployAtomic(keyPath, knownHostsPath) {
  required("HOSTINGER_SSH_HOST", sshHost);
  required("HOSTINGER_SSH_USER", sshUser);
  required("HOSTINGER_DEPLOYMENT_ROOT", deploymentRoot);
  required("HOSTINGER_WEB_ROOT", webRoot);

  const archivePath = createArchive();
  const remote = `${sshUser}@${sshHost}`;
  const releasesRoot = `${deploymentRoot}/releases`;
  const releaseRoot = `${releasesRoot}/${releaseId}`;
  const uploadPath = `${deploymentRoot}/incoming-${releaseId}.tar.gz`;

  run("scp", [...sshArgs(keyPath, knownHostsPath), archivePath, `${remote}:${uploadPath}`]);

  run("ssh", [
    ...sshArgs(keyPath, knownHostsPath),
    remote,
    [
      `set -euo pipefail`,
      `mkdir -p '${releasesRoot}'`,
      `rm -rf '${releaseRoot}'`,
      `mkdir -p '${releaseRoot}'`,
      `tar -xzf '${uploadPath}' -C '${releaseRoot}'`,
      `rm -f '${uploadPath}'`,
      `ln -sfn '${releaseRoot}' '${webRoot}'`,
      `printf '%s\n' '${releaseId}' > '${deploymentRoot}/current-release.txt'`,
    ].join(" && "),
  ]);

  console.log(`Atomic deployment completed for release ${releaseId}`);
}

function deployStatic(keyPath, knownHostsPath) {
  required("HOSTINGER_SSH_HOST", sshHost);
  required("HOSTINGER_SSH_USER", sshUser);
  required("HOSTINGER_WEB_ROOT", webRoot);

  const archivePath = createArchive();
  const remote = `${sshUser}@${sshHost}`;
  const uploadPath = `${webRoot.replace(/\/$/, "")}/incoming-${releaseId}.tar.gz`;

  run("scp", [...sshArgs(keyPath, knownHostsPath), archivePath, `${remote}:${uploadPath}`]);

  run("ssh", [
    ...sshArgs(keyPath, knownHostsPath),
    remote,
    [
      `set -euo pipefail`,
      `mkdir -p '${webRoot}'`,
      `tar -xzf '${uploadPath}' -C '${webRoot}'`,
      `rm -f '${uploadPath}'`,
    ].join(" && "),
  ]);

  console.log(`Static deployment completed for release ${releaseId}`);
}

if (mode === "manual-hold") {
  throw new Error(
    "HOSTINGER_DEPLOYMENT_MODE is manual-hold. Inspect the Hostinger plan first and set ssh-atomic, vps-atomic, or ssh-static before deploying.",
  );
}

const { keyPath, knownHostsPath } = prepareSshKey();

if (mode === "ssh-atomic" || mode === "vps-atomic") {
  deployAtomic(keyPath, knownHostsPath);
} else if (mode === "ssh-static") {
  deployStatic(keyPath, knownHostsPath);
} else {
  throw new Error(`Unsupported HOSTINGER_DEPLOYMENT_MODE: ${mode}`);
}
