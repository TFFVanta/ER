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

  let knownHostsPath;
  const knownHosts = process.env.HOSTINGER_SSH_KNOWN_HOSTS;
  if (knownHosts) {
    knownHostsPath = path.join(sshDir, "known_hosts");
    fs.writeFileSync(knownHostsPath, `${knownHosts.trim()}\n`, { mode: 0o600 });
  }

  return { keyPath, knownHostsPath };
}

function sshArgs(keyPath, knownHostsPath) {
  const hostKeyOpts = knownHostsPath
    ? ["-o", `UserKnownHostsFile=${knownHostsPath}`, "-o", "StrictHostKeyChecking=yes"]
    : ["-o", "StrictHostKeyChecking=accept-new"];
  return ["-i", keyPath, "-p", sshPort, ...hostKeyOpts];
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

const { keyPath, knownHostsPath } = prepareSshKey();
const remote = `${sshUser}@${sshHost}`;
const releasesRoot = `${deploymentRoot}/releases`;
const currentReleaseFile = `${deploymentRoot}/current-release.txt`;

// Without an explicit target, roll back to the newest release that isn't the one
// deploy.mjs recorded as current in current-release.txt. Falling back to "2nd most
// recent by mtime" (the old behavior) breaks if anything besides a deploy touches a
// release directory's mtime, and ignores the file deploy.mjs writes for this exact purpose.
const releaseSelector = targetRelease
  ? `TARGET_RELEASE='${targetRelease}'`
  : [
      `CURRENT_RELEASE="$(cat '${currentReleaseFile}' 2>/dev/null || true)"`,
      `TARGET_RELEASE="$(ls -1dt '${releasesRoot}'/* 2>/dev/null | grep -vFx "${releasesRoot}/$CURRENT_RELEASE" | sed -n '1p')"`,
    ].join(" && ");

run("ssh", [
  ...sshArgs(keyPath, knownHostsPath),
  remote,
  [
    `set -euo pipefail`,
    releaseSelector,
    `if [ -z "$TARGET_RELEASE" ]; then echo 'No rollback target found' >&2; exit 1; fi`,
    `if [ ! -d "$TARGET_RELEASE" ]; then echo 'Rollback target does not exist' >&2; exit 1; fi`,
    `ln -sfn "$TARGET_RELEASE" '${webRoot}'`,
    `basename "$TARGET_RELEASE" > '${currentReleaseFile}'`,
  ].join(" && "),
]);

console.log(`Rollback completed${targetRelease ? ` to ${targetRelease}` : ""}`);
