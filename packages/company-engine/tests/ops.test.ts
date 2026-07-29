import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { summarizeVenture } from "../src/ops.js";

describe("summarizeVenture", () => {
  it("reports hasBridge: false when no bridge files exist", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "company-engine-ops-"));
    const summary = summarizeVenture({ name: "Exotic Remedy", bridgeRoot: dir });
    expect(summary).toEqual({ name: "Exotic Remedy", hasBridge: false });
  });

  it("summarizes roadmap step counts and state fields when present", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "company-engine-ops-"));
    fs.writeFileSync(
      path.join(dir, "roadmap.json"),
      JSON.stringify([{ status: "completed" }, { status: "completed" }, { status: "ready" }]),
    );
    fs.writeFileSync(
      path.join(dir, "state.json"),
      JSON.stringify({ autoMode: "paused", status: "paused", updatedAt: "2026-07-29T00:00:00Z", blockers: [] }),
    );

    const summary = summarizeVenture({ name: "EXOTIC", bridgeRoot: dir });
    expect(summary.hasBridge).toBe(true);
    expect(summary.totalSteps).toBe(3);
    expect(summary.stepCounts).toEqual({ completed: 2, ready: 1 });
    expect(summary.autoMode).toBe("paused");
  });
});
