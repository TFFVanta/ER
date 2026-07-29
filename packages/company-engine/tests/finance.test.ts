import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readLedger } from "../src/finance.js";

describe("readLedger", () => {
  it("reports hasData: false with no fabricated numbers when the ledger file is missing", () => {
    const summary = readLedger(path.join(os.tmpdir(), "does-not-exist-ledger.json"));
    expect(summary).toEqual({
      hasData: false,
      entryCount: 0,
      totalRevenue: 0,
      totalCost: 0,
      net: 0,
      byVenture: {},
    });
  });

  it("sums revenue/cost per venture from real ledger entries", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "company-engine-finance-"));
    const file = path.join(dir, "ledger.json");
    fs.writeFileSync(
      file,
      JSON.stringify([
        { date: "2026-07-01", venture: "EXOTIC", type: "cost", amount: 20, note: "domain renewal" },
        { date: "2026-07-15", venture: "Exotic Remedy", type: "revenue", amount: 150, note: "first sale" },
      ]),
    );

    const summary = readLedger(file);
    expect(summary.hasData).toBe(true);
    expect(summary.totalRevenue).toBe(150);
    expect(summary.totalCost).toBe(20);
    expect(summary.net).toBe(130);
    expect(summary.byVenture["Exotic Remedy"]).toEqual({ revenue: 150, cost: 0 });
  });
});
