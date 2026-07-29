import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BounceIn, Button, Card, Chip, Eyebrow, Input, Section, SectionGrid } from "../src/index.js";

describe("ui-remedy package smoke", () => {
  it("has a valid Exotic Remedy package manifest", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
    expect(pkg.name).toBe("@exotic/ui-remedy");
  });

  it("exports every advertised component from the source barrel", () => {
    const barrel = fs.readFileSync(path.resolve("src/index.ts"), "utf8");
    for (const name of ["Button", "Card", "Chip", "Eyebrow", "Input", "BounceIn", "Section"]) {
      expect(barrel).toMatch(new RegExp(`export \\{[^}]*\\b${name}\\b[^}]*\\}`));
    }
  });

  it("every component actually renders non-empty markup with the expected base class", () => {
    const cases: [ReturnType<typeof createElement>, string][] = [
      [createElement(Button, {}, "Go"), "remedy-button"],
      [createElement(Card, { eyebrow: "Eyebrow", title: "Title" }, "Body"), "remedy-card"],
      [createElement(Chip, {}, "Tag"), "remedy-chip"],
      [createElement(Eyebrow, {}, "Label"), "remedy-eyebrow"],
      [createElement(Input, { placeholder: "Search" }), "remedy-input"],
      [createElement(BounceIn, {}, "Content"), "remedy-bounce-in"],
      [createElement(Section, { title: "Section" }), "remedy-section"],
      [createElement(SectionGrid, {}, "Grid"), "remedy-section__grid"],
      [createElement(Card, { pattern: "dots" }, "Body"), "remedy-pattern-dots"],
    ];
    for (const [element, expectedClass] of cases) {
      const html = renderToStaticMarkup(element);
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(expectedClass);
    }
  });
});
