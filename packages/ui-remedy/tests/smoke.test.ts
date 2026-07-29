import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("ui-remedy package smoke", () => {
  it("has a valid Exotic Remedy package manifest", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
    expect(pkg.name).toBe("@exotic/ui-remedy");
  });

  it("exports every advertised component from the source barrel", () => {
    const barrel = fs.readFileSync(path.resolve("src/index.ts"), "utf8");
    for (const name of ["Button", "Card", "Chip", "Eyebrow", "Input", "BounceIn"]) {
      expect(barrel).toContain(`export { ${name} }`);
    }
  });

  it("every component file uses class names defined in styles.css", () => {
    const styles = fs.readFileSync(path.resolve("src/styles.css"), "utf8");
    const componentsDir = path.resolve("src/components");
    for (const file of fs.readdirSync(componentsDir)) {
      const source = fs.readFileSync(path.join(componentsDir, file), "utf8");
      const classNames = [
        ...new Set(
          [...source.matchAll(/remedy-[a-z-]+/g)].map((m) => m[0].replace(/-+$/, "")),
        ),
      ];
      expect(classNames.length).toBeGreaterThan(0);
      for (const className of classNames) {
        expect(styles).toContain(`.${className}`);
      }
    }
  });
});
