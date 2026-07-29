import * as esbuild from "esbuild";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

console.log("Built @exotic/ui -> dist/index.js, dist/index.css, dist/*.d.ts");
