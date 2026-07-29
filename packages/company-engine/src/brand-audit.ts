import fs from "node:fs";

export interface BrandFinding {
  level: "ok" | "warn";
  brand: string;
  message: string;
}

/** Pulls the declaration block for `selector { ... }` out of raw CSS text. */
function extractBlock(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
}

const FORBIDDEN_ANIMATION_NAMES = ["bounce", "wiggle", "pop", "shake", "spin"];
const FORBIDDEN_FILL_PROPERTIES = ["gradient", "box-shadow"];

/**
 * Checks each kit's own base styles.css against its brand's design law. Advise-only: reports
 * findings, changes nothing. EXOTIC's law: "quiet motion, not playful flourish" (no bouncy
 * keyframes on core components). Exotic Remedy's law: flat fill, no gradients/shadows on the
 * mascot-adjacent components (pattern utility classes are exempt - they're documented texture).
 */
export function auditBrand(options: { exoticUiStylesPath: string; remedyUiStylesPath: string }): BrandFinding[] {
  const findings: BrandFinding[] = [];

  if (fs.existsSync(options.exoticUiStylesPath)) {
    const css = fs.readFileSync(options.exoticUiStylesPath, "utf8");
    const violating = FORBIDDEN_ANIMATION_NAMES.filter((name) => css.includes(`exotic-${name}`));
    if (violating.length) {
      findings.push({
        level: "warn",
        brand: "EXOTIC",
        message: `Found playful animation name(s) [${violating.join(", ")}] in @exotic/ui - violates "quiet motion, not playful flourish" (brand/identity.md Design Law).`,
      });
    } else {
      findings.push({ level: "ok", brand: "EXOTIC", message: "No playful animation names in @exotic/ui." });
    }
  }

  if (fs.existsSync(options.remedyUiStylesPath)) {
    const css = fs.readFileSync(options.remedyUiStylesPath, "utf8");
    const cardBlock = extractBlock(css, ".remedy-card") ?? "";
    const buttonBlock = extractBlock(css, ".remedy-button") ?? "";
    const violating = FORBIDDEN_FILL_PROPERTIES.filter(
      (prop) => cardBlock.includes(prop) || buttonBlock.includes(prop),
    );
    if (violating.length) {
      findings.push({
        level: "warn",
        brand: "Exotic Remedy",
        message: `Found [${violating.join(", ")}] on .remedy-card/.remedy-button - violates "flat fill... no gradients, no shading, no drop shadows" (brand/exotic-remedy/aesthetic.md).`,
      });
    } else {
      findings.push({
        level: "ok",
        brand: "Exotic Remedy",
        message: "No gradient/shadow fills on core .remedy-card/.remedy-button.",
      });
    }
  }

  return findings;
}
