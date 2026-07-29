import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Shared by every @exotic/ui-* component kit's package.json "build" script (each kit's own
// scripts/build.mjs is a 2-line wrapper calling this with its own package root). Previously
// each kit carried an identical ~30-line copy of this file - a duplication that would have
// silently diverged the moment one kit's build needed a fix the other didn't get.
export async function buildComponentKit(pkgRoot, packageName) {
  await esbuild.build({
    entryPoints: [path.join(pkgRoot, "src", "index.ts")],
    outfile: path.join(pkgRoot, "dist", "index.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    jsx: "automatic",
    external: ["react", "react-dom", "react/jsx-runtime"],
    sourcemap: true,
    logLevel: "info",
  });

  const repoRoot = path.resolve(pkgRoot, "..", "..");
  const tscScript = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");

  execFileSync(process.execPath, [tscScript, "-p", "tsconfig.json", "--emitDeclarationOnly"], {
    cwd: pkgRoot,
    stdio: "inherit",
  });

  console.log(`Built ${packageName} -> dist/index.js, dist/index.css, dist/*.d.ts`);

  // templates/ are reference page compositions, not part of the published package - but they
  // used to be excluded from every tsconfig entirely, so a breaking change to this kit's own
  // API could silently rot every template with nobody finding out. Type-checking them here
  // (against the dist/*.d.ts just emitted above, i.e. the real public API) on every build
  // catches that immediately instead of leaving it to a future manual discovery.
  const templatesConfig = path.join(pkgRoot, "tsconfig.templates.json");
  if (fs.existsSync(templatesConfig)) {
    execFileSync(process.execPath, [tscScript, "-p", "tsconfig.templates.json", "--noEmit"], {
      cwd: pkgRoot,
      stdio: "inherit",
    });
    console.log(`Type-checked ${packageName}/templates against the built public API.`);
  }
}
