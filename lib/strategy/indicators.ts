/**
 * Pure indicator functions, ported 1:1 from the Python reference
 * (`trading/strategies/indicators.py`, `trading/execution/risk.py`).
 * Numeric parity with the oracle is enforced by tests/strategy-parity.test.ts
 * — do not change formulas (seeding, population std, √365) without re-running
 * the parity suite.
 *
 * All functions return arrays aligned to the input with `null` during warm-up.
 */

/** Rolling arithmetic mean; `null` for `i < length − 1`. */
export const sma = (
  values: number[],
  length: number,
): (number | null)[] => {
  const out: (number | null)[] = new Array<number | null>(values.length).fill(
    null,
  );
  let acc = 0;
  for (let i = 0; i < values.length; i++) {
    acc += values[i];
    if (i >= length) acc -= values[i - length];
    if (i >= length - 1) out[i] = acc / length;
  }
  return out;
};

/**
 * Exponential moving average with SMA seeding: `null` for `i < length − 1`,
 * seeded at `i = length − 1` with the SMA of the first `length` values, then
 * `EMA[i] = values[i]·k + EMA[i−1]·(1−k)` with `k = 2/(length+1)`.
 */
export const ema = (
  values: number[],
  length: number,
): (number | null)[] => {
  const out: (number | null)[] = new Array<number | null>(values.length).fill(
    null,
  );
  const k = 2 / (length + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < length - 1) continue;
    if (prev === null) {
      let sum = 0;
      for (let j = i - length + 1; j <= i; j++) sum += values[j];
      prev = sum / length;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out[i] = prev;
  }
  return out;
};

/**
 * Annualized rolling volatility of simple daily returns: population std
 * (÷ window, not window − 1) of the last `window` returns, × √365. `null`
 * until `window` returns are available (i.e. first value at `i = window`).
 */
export const realizedVol = (
  closes: number[],
  window: number,
): (number | null)[] => {
  const n = closes.length;
  const rets: (number | null)[] = new Array<number | null>(n).fill(null);
  for (let i = 1; i < n; i++) rets[i] = closes[i] / closes[i - 1] - 1;

  const out: (number | null)[] = new Array<number | null>(n).fill(null);
  for (let i = 0; i < n; i++) {
    const w: number[] = [];
    for (let j = Math.max(0, i - window + 1); j <= i; j++) {
      const r = rets[j];
      if (r !== null) w.push(r);
    }
    if (w.length < window) continue;
    const m = w.reduce((s, x) => s + x, 0) / w.length;
    const sd = Math.sqrt(
      w.reduce((s, x) => s + (x - m) * (x - m), 0) / w.length,
    );
    out[i] = sd * Math.sqrt(365);
  }
  return out;
};
