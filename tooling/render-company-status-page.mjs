import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The permanent, real tracer bullet StatusPage.tsx was missing: this actually renders it with
// real gatherCompanyStatus() data every time it's run, instead of only ever compiling inside a
// throwaway .preview/ script that got deleted after a manual screenshot. Run via
// `npm run company:status:page`.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, ".exotic", "company");
const outFile = path.join(outDir, "status.html");
const bundleFile = path.join(outDir, ".status-page-bundle.mjs");

fs.mkdirSync(outDir, { recursive: true });

const companyEngineEntry = path.join(repoRoot, "packages", "company-engine", "dist", "index.js");
if (!fs.existsSync(companyEngineEntry)) {
  console.error("@exotic/company-engine has not been built. Run \"npm run build\" first.");
  process.exit(1);
}
const { gatherCompanyStatus } = await import(pathToFileURL(companyEngineEntry).href);
const status = gatherCompanyStatus(repoRoot);

// StatusPage.tsx imports "@exotic/ui" for its components, which itself imports "./styles.css"
// as a side effect - meaningless in a Node SSR bundle, so those CSS imports are emptied out
// here. The real stylesheet is read directly (below) and inlined into the HTML shell instead.
await esbuild.build({
  entryPoints: [path.join(repoRoot, "packages", "ui", "templates", "StatusPage.tsx")],
  outfile: bundleFile,
  bundle: true,
  format: "esm",
  platform: "node",
  jsx: "automatic",
  external: ["react", "react-dom", "react-dom/server"],
  loader: { ".css": "empty" },
  logLevel: "info",
});

const { StatusPage } = await import(pathToFileURL(bundleFile).href);
const bodyHtml = renderToStaticMarkup(createElement(StatusPage, status));
const css = fs.readFileSync(path.join(repoRoot, "packages", "ui", "dist", "index.css"), "utf8");

fs.writeFileSync(
  outFile,
  `<!doctype html>\n<html>\n<head><meta charset="utf-8" /><title>EXOTIC company status</title><style>${css}</style></head>\n<body style="margin:0;">${bodyHtml}</body>\n</html>\n`,
);
fs.rmSync(bundleFile, { force: true });

console.log(`Wrote ${outFile}`);
