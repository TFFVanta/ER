import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditBrand } from "../src/brand-audit.js";

function writeTempCss(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "company-engine-brand-"));
  const file = path.join(dir, "styles.css");
  fs.writeFileSync(file, content);
  return file;
}

describe("auditBrand", () => {
  it("flags playful animation names in the EXOTIC kit", () => {
    const exoticCss = writeTempCss(".exotic-bounce-in { animation: bounce 300ms; }");
    const remedyCss = writeTempCss(".remedy-card { border: 3px solid black; }");

    const findings = auditBrand({ exoticUiStylesPath: exoticCss, remedyUiStylesPath: remedyCss });
    const exoticFinding = findings.find((f) => f.brand === "EXOTIC");
    expect(exoticFinding?.level).toBe("warn");
  });

  it("flags gradient/shadow fills on Exotic Remedy's core components", () => {
    const exoticCss = writeTempCss(".exotic-fade-in { animation: fade 300ms; }");
    const remedyCss = writeTempCss(".remedy-card { background: linear-gradient(red, blue); }");

    const findings = auditBrand({ exoticUiStylesPath: exoticCss, remedyUiStylesPath: remedyCss });
    const remedyFinding = findings.find((f) => f.brand === "Exotic Remedy");
    expect(remedyFinding?.level).toBe("warn");
  });

  it("reports ok when both kits are clean", () => {
    const exoticCss = writeTempCss(".exotic-fade-in { animation: fade 300ms; }");
    const remedyCss = writeTempCss(
      ".remedy-card { border: 3px solid black; }\n.remedy-pattern-dots { background-image: radial-gradient(black 1px, transparent 1px); }",
    );

    const findings = auditBrand({ exoticUiStylesPath: exoticCss, remedyUiStylesPath: remedyCss });
    expect(findings.every((f) => f.level === "ok")).toBe(true);
  });
});
