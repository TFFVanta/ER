import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const mode = process.env.HOSTINGER_DEPLOYMENT_MODE || "manual-hold";
const sshHost = process.env.HOSTINGER_SSH_HOST;
const sshPort = process.env.HOSTINGER_SSH_PORT || "22";
const sshUser = process.env.HOSTINGER_SSH_USER;
const deploymentRoot = process.env.HOSTINGER_DEPLOYMENT_ROOT;
const webRoot = process.env.HOSTINGER_WEB_ROOT;
const targetRelease = process.env.ROLLBACK_RELEASE_ID || "";

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required rollback environment variable: ${name}`);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function prepareSshKey() {
  const key = process.env.HOSTINGER_SSH_PRIVATE_KEY;
  required("HOSTINGER_SSH_PRIVATE_KEY", key);

  const sshDir = fs.mkdtempSync(path.join(os.tmpdir(), "exotic-hostinger-rollback-"));
  const keyPath = path.join(sshDir, "id_ed25519");
  fs.writeFileSync(keyPath, `${key.trim()}\n`, { mode: 0o600 });

  return keyPath;
}

function sshArgs(keyPath) {
  return ["-i", keyPath, "-p", sshPort, "-o", "StrictHostKeyChecking=no"];
}

if (mode !== "ssh-atomic" && mode !== "vps-atomic") {
  throw new Error(
    "Rollback is only supported for ssh-atomic or vps-atomic mode. Static deploys do not provide safe automated rollback.",
  );
}

required("HOSTINGER_SSH_HOST", sshHost);
required("HOSTINGER_SSH_USER", sshUser);
required("HOSTINGER_DEPLOYMENT_ROOT", deploymentRoot);
required("HOSTINGER_WEB_ROOT", webRoot);

const keyPath = prepareSshKey();
const remote = `${sshUser}@${sshHost}`;
const releasesRoot = `${deploymentRoot}/releases`;

const releaseSelector = targetRelease
  ? `TARGET_RELEASE='${targetRelease}'`
  : `TARGET_RELEASE="$(ls -1dt '${releasesRoot}'/* 2>/dev/null | sed -n '2p')"`;

run("ssh", [
  ...sshArgs(keyPath),
  remote,
  [
    `set -euo pipefail`,
    releaseSelector,
    `if [ -z "$TARGET_RELEASE" ]; then echo 'No rollback target found' >&2; exit 1; fi`,
    `if [ ! -d "$TARGET_RELEASE" ]; then echo 'Rollback target does not exist' >&2; exit 1; fi`,
    `ln -sfn "$TARGET_RELEASE" '${webRoot}'`,
    `basename "$TARGET_RELEASE" > '${deploymentRoot}/current-release.txt'`,
  ].join(" && "),
]);

console.log(`Rollback completed${targetRelease ? ` to ${targetRelease}` : ""}`);
