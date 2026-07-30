import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readLearningLabs } from "../src/learning.js";

describe("readLearningLabs", () => {
  it("reports hasData: false when no state file exists", () => {
    const summary = readLearningLabs(path.join(os.tmpdir(), "does-not-exist-objectives.json"));
    expect(summary).toEqual({ hasData: false, totalLessons: 0, promotedCount: 0, recent: [] });
  });

  it("summarizes lessons and marks promoted ones via selectors", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "company-engine-learning-"));
    const file = path.join(dir, "objectives.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        lessons: [
          { id: "LESSON-1", title: "Lesson from step A", status: "captured", created_at: "2026-07-01T00:00:00Z" },
          { id: "LESSON-2", title: "Lesson from step B", status: "captured", created_at: "2026-07-02T00:00:00Z" },
        ],
        selectors: [{ lesson_id: "LESSON-1" }],
      }),
    );

    const summary = readLearningLabs(file);
    expect(summary.hasData).toBe(true);
    expect(summary.totalLessons).toBe(2);
    expect(summary.promotedCount).toBe(1);
    expect(summary.recent.find((l) => l.id === "LESSON-1")?.promoted).toBe(true);
    expect(summary.recent.find((l) => l.id === "LESSON-2")?.promoted).toBe(false);
  });

  it("caps recent to 5 most-recent-first entries", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "company-engine-learning-cap-"));
    const file = path.join(dir, "objectives.json");
    const lessons = Array.from({ length: 8 }, (_, i) => ({
      id: `LESSON-${i}`,
      title: `Lesson ${i}`,
      status: "captured",
      created_at: `2026-07-0${(i % 9) + 1}T00:00:00Z`,
    }));
    fs.writeFileSync(file, JSON.stringify({ lessons, selectors: [] }));

    const summary = readLearningLabs(file);
    expect(summary.totalLessons).toBe(8);
    expect(summary.recent).toHaveLength(5);
  });
});
