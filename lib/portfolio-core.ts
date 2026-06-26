/**
 * Pure portfolio math — no React, no I/O — so it can be unit-tested directly.
 * All values are USD-denominated (see plan: v1 portfolio is USD-only).
 *
 * Positions are derived from a transaction ledger using **average-cost** basis:
 * buys add to quantity and cost; sells remove a proportional slice of the
 * average cost and book the difference against proceeds as realized P&L.
 */

import type { Position, Transaction } from "@/lib/types";

/** USD price + 24h change for a coin, keyed by CoinGecko id. */
export interface CoinPrice {
  /** Current USD price. */
  usd: number;
  /** 24h price change as a percentage, e.g. -3.4. */
  usd_24h_change?: number;
}

export type PriceMap = Record<string, CoinPrice>;

/** Current market value of a quantity at a price. */
export const holdingValue = (quantity: number, price: number): number =>
  quantity * price;

/** Profit/loss as a percentage of cost (0 when cost is 0). */
export const pnlPct = (value: number, cost: number): number =>
  cost > 0 ? ((value - cost) / cost) * 100 : 0;

/**
 * Collapse a transaction ledger into one average-cost {@link Position} per coin.
 * Transactions are processed in chronological order; a coin keeps its latest
 * metadata (name/symbol/image). Positions with no remaining quantity are still
 * returned when they carry realized P&L.
 */
export const derivePositions = (transactions: Transaction[]): Position[] => {
  const ordered = [...transactions].sort(
    (a, b) => a.date - b.date || a.createdAt - b.createdAt,
  );
  const byCoin = new Map<string, Position>();

  for (const tx of ordered) {
    const pos =
      byCoin.get(tx.coinId) ??
      ({
        coinId: tx.coinId,
        symbol: tx.symbol,
        name: tx.name,
        image: tx.image,
        quantity: 0,
        costBasis: 0,
        realized: 0,
        realizedCost: 0,
      } satisfies Position);

    // Refresh metadata from the most recent transaction seen.
    pos.symbol = tx.symbol;
    pos.name = tx.name;
    pos.image = tx.image;

    if (tx.type === "buy") {
      pos.quantity += tx.quantity;
      pos.costBasis += tx.amount;
    } else {
      const avgCost = pos.quantity > 0 ? pos.costBasis / pos.quantity : 0;
      const qtyRemoved = Math.min(tx.quantity, pos.quantity);
      const costRemoved = avgCost * qtyRemoved;
      // Proceeds attributable to the units actually held (ignore oversell).
      const proceeds =
        tx.quantity > 0 ? tx.amount * (qtyRemoved / tx.quantity) : 0;
      pos.realized += proceeds - costRemoved;
      pos.realizedCost += costRemoved;
      pos.quantity -= qtyRemoved;
      pos.costBasis -= costRemoved;
    }

    byCoin.set(tx.coinId, pos);
  }

  return [...byCoin.values()];
};

export interface PortfolioTotals {
  /** Current total market value of held units. */
  value: number;
  /** Total cost basis of held units. */
  cost: number;
  /** Unrealized P&L (value − cost). */
  pnl: number;
  /** Unrealized P&L as a percentage of cost. */
  pnlPct: number;
  /** Realized P&L booked from sells. */
  realized: number;
  /** Cost basis of the units that were sold (denominator for realized %). */
  realizedCost: number;
  /** Realized P&L as a percentage of the cost of the units sold. */
  realizedPct: number;
  /** 24h change in value (USD). */
  change24h: number;
  /** 24h change as a percentage of the value 24h ago. */
  change24hPct: number;
}

/** Aggregate totals across all positions, given a current price map. */
export const portfolioTotals = (
  positions: Position[],
  prices: PriceMap,
): PortfolioTotals => {
  let value = 0;
  let cost = 0;
  let realized = 0;
  let realizedCost = 0;
  let value24hAgo = 0;

  for (const p of positions) {
    const price = prices[p.coinId]?.usd ?? 0;
    const change = prices[p.coinId]?.usd_24h_change ?? 0;
    const v = holdingValue(p.quantity, price);
    value += v;
    cost += p.costBasis;
    realized += p.realized;
    realizedCost += p.realizedCost;
    value24hAgo += change !== -100 ? v / (1 + change / 100) : 0;
  }

  const change24h = value - value24hAgo;
  return {
    value,
    cost,
    pnl: value - cost,
    pnlPct: pnlPct(value, cost),
    realized,
    realizedCost,
    realizedPct: realizedCost > 0 ? (realized / realizedCost) * 100 : 0,
    change24h,
    change24hPct: value24hAgo > 0 ? (change24h / value24hAgo) * 100 : 0,
  };
};

export interface Allocation {
  coinId: string;
  value: number;
  /** Share of the total portfolio value, as a percentage. */
  pct: number;
}

/** Per-position share of total portfolio value, largest first. */
export const allocations = (
  positions: Position[],
  prices: PriceMap,
): Allocation[] => {
  const rows = positions.map((p) => ({
    coinId: p.coinId,
    value: holdingValue(p.quantity, prices[p.coinId]?.usd ?? 0),
  }));
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return rows
    .map((r) => ({ ...r, pct: total > 0 ? (r.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
};

export interface PerformerStat {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  /** Current market value of the held units. */
  value: number;
  /** Unrealized P&L in USD. */
  pnl: number;
  /** Unrealized P&L as a percentage of cost. */
  pnlPct: number;
}

/**
 * Best- and worst-performing open positions by unrealized P&L %. Only positions
 * with held units and a non-zero cost basis qualify; returns nulls when none do.
 */
export const bestWorstPerformers = (
  positions: Position[],
  prices: PriceMap,
): { best: PerformerStat | null; worst: PerformerStat | null } => {
  const stats: PerformerStat[] = positions
    .filter((p) => p.quantity > 0 && p.costBasis > 0)
    .map((p) => {
      const value = holdingValue(p.quantity, prices[p.coinId]?.usd ?? 0);
      return {
        coinId: p.coinId,
        symbol: p.symbol,
        name: p.name,
        image: p.image,
        value,
        pnl: value - p.costBasis,
        pnlPct: pnlPct(value, p.costBasis),
      };
    });

  if (stats.length === 0) return { best: null, worst: null };
  let best = stats[0];
  let worst = stats[0];
  for (const s of stats) {
    if (s.pnlPct > best.pnlPct) best = s;
    if (s.pnlPct < worst.pnlPct) worst = s;
  }
  return { best, worst };
};

export interface WhatIf {
  coinId: string;
  addUsd: number;
  /** Current price used for the projection. */
  price: number;
  /** Units the added USD would buy at the current price. */
  addedUnits: number;
  /** Projected total portfolio value after the buy. */
  newValue: number;
  /** Projected total cost basis after the buy. */
  newCost: number;
  /** Projected unrealized P&L after the buy. */
  newPnl: number;
  newPnlPct: number;
  /** Projected average cost for the target coin. */
  newAvgCost: number;
  /** Projected allocation share of the target coin (%). */
  newAllocationPct: number;
}

/**
 * Project the portfolio after buying `addUsd` of `coinId` at its current price.
 * Forward-looking only (uses live prices, no historical data). Returns null when
 * the price or amount is non-positive.
 */
export const whatIf = (
  positions: Position[],
  prices: PriceMap,
  coinId: string,
  addUsd: number,
): WhatIf | null => {
  const price = prices[coinId]?.usd ?? 0;
  if (price <= 0 || addUsd <= 0) return null;

  const addedUnits = addUsd / price;
  const current = portfolioTotals(positions, prices);
  // Units are bought at the current price, so added value equals added cost.
  const newValue = current.value + addUsd;
  const newCost = current.cost + addUsd;

  const existing = positions.find((p) => p.coinId === coinId);
  const newQty = (existing?.quantity ?? 0) + addedUnits;
  const newCoinCost = (existing?.costBasis ?? 0) + addUsd;
  const newCoinValue = newQty * price;

  return {
    coinId,
    addUsd,
    price,
    addedUnits,
    newValue,
    newCost,
    newPnl: newValue - newCost,
    newPnlPct: pnlPct(newValue, newCost),
    newAvgCost: newQty > 0 ? newCoinCost / newQty : 0,
    newAllocationPct: newValue > 0 ? (newCoinValue / newValue) * 100 : 0,
  };
};
