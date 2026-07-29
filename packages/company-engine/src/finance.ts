import fs from "node:fs";

export interface LedgerEntry {
  date: string;
  venture: string;
  type: "revenue" | "cost";
  amount: number;
  note: string;
}

export interface FinanceSummary {
  hasData: boolean;
  entryCount: number;
  totalRevenue: number;
  totalCost: number;
  net: number;
  byVenture: Record<string, { revenue: number; cost: number }>;
}

/**
 * No automated revenue/cost source exists yet (no bank/Stripe integration) - this reads a
 * manually maintained JSON ledger. If the file is missing, says so plainly rather than
 * fabricating figures. This module only ever reads; it has no write/spend authority.
 */
export function readLedger(ledgerPath: string): FinanceSummary {
  if (!fs.existsSync(ledgerPath)) {
    return { hasData: false, entryCount: 0, totalRevenue: 0, totalCost: 0, net: 0, byVenture: {} };
  }

  const entries: LedgerEntry[] = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  const byVenture: Record<string, { revenue: number; cost: number }> = {};
  let totalRevenue = 0;
  let totalCost = 0;

  for (const entry of entries) {
    byVenture[entry.venture] ??= { revenue: 0, cost: 0 };
    if (entry.type === "revenue") {
      totalRevenue += entry.amount;
      byVenture[entry.venture].revenue += entry.amount;
    } else {
      totalCost += entry.amount;
      byVenture[entry.venture].cost += entry.amount;
    }
  }

  return {
    hasData: entries.length > 0,
    entryCount: entries.length,
    totalRevenue,
    totalCost,
    net: totalRevenue - totalCost,
    byVenture,
  };
}
