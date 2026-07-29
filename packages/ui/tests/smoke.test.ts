import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Badge,
  Button,
  Card,
  Chip,
  Eyebrow,
  FadeIn,
  Input,
  Section,
  SectionGrid,
  Stat,
} from "../src/index.js";

describe("ui package smoke", () => {
  it("has a valid Exotic package manifest", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
    expect(pkg.name).toBe("@exotic/ui");
  });

  it("exports every advertised component from the source barrel", () => {
    const barrel = fs.readFileSync(path.resolve("src/index.ts"), "utf8");
    for (const name of ["Button", "Card", "Chip", "Eyebrow", "Input", "FadeIn", "Section", "Stat", "Badge"]) {
      expect(barrel).toMatch(new RegExp(`export \\{[^}]*\\b${name}\\b[^}]*\\}`));
    }
  });

  it("every component actually renders non-empty markup with the expected base class", () => {
    const cases: [ReturnType<typeof createElement>, string][] = [
      [createElement(Button, {}, "Go"), "exotic-button"],
      [createElement(Card, { eyebrow: "Eyebrow", title: "Title" }, "Body"), "exotic-card"],
      [createElement(Chip, {}, "Tag"), "exotic-chip"],
      [createElement(Eyebrow, {}, "Label"), "exotic-eyebrow"],
      [createElement(Input, { placeholder: "Search" }), "exotic-input"],
      [createElement(FadeIn, {}, "Content"), "exotic-fade-in"],
      [createElement(Section, { title: "Section" }), "exotic-section"],
      [createElement(SectionGrid, {}, "Grid"), "exotic-section__grid"],
      [createElement(Stat, { value: 1, label: "Metric" }), "exotic-stat"],
      [createElement(Badge, {}, "State"), "exotic-badge"],
      [createElement(Badge, { tone: "critical" }, "Blocked"), "exotic-badge--critical"],
    ];
    for (const [element, expectedClass] of cases) {
      const html = renderToStaticMarkup(element);
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(expectedClass);
    }
  });
});
