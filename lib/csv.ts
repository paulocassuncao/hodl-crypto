/**
 * CSV import/export for the portfolio transaction ledger.
 *
 * Export emits one row per transaction with a canonical `Coin` (CoinGecko id)
 * column so a round-trip re-imports cleanly. Import is lenient about column
 * order and case, validates each row, and reports per-row errors rather than
 * failing the whole file. Pure (no React/I/O) so it can be unit-tested.
 */

import type { Transaction } from "@/lib/types";

/** A parsed transaction ready to be added to the ledger (id/createdAt assigned later). */
export type CsvTransaction = Omit<Transaction, "id" | "createdAt">;

const HEADERS = [
  "Date",
  "Coin",
  "Symbol",
  "Name",
  "Type",
  "Quantity",
  "Amount",
  "Image",
] as const;

/** Quote a field when it contains a comma, quote, or newline. */
const escapeField = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const toIsoDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Serialize transactions to a CSV string with a header row. */
export const transactionsToCsv = (txs: Transaction[]): string => {
  const lines = [HEADERS.join(",")];
  for (const t of txs) {
    lines.push(
      [
        toIsoDate(t.date),
        t.coinId,
        t.symbol,
        t.name,
        t.type,
        String(t.quantity),
        String(t.amount),
        t.image,
      ]
        .map(escapeField)
        .join(","),
    );
  }
  return lines.join("\n");
};

/** Split a single CSV line into fields, honoring double-quoted values. */
const parseCsvLine = (line: string): string[] => {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
};

/** Parse an ISO date (yyyy-mm-dd) or epoch-ms string to epoch ms, or null. */
const parseDate = (value: string): number | null => {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const ms = Number(trimmed);
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = new Date(`${trimmed}T00:00:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export interface CsvParseResult {
  rows: CsvTransaction[];
  errors: string[];
}

/**
 * Parse a CSV string into transactions. Required columns (any order, any case):
 * Date, Coin, Type, Quantity, Amount. Symbol, Name, and Image are optional and
 * fall back to the coin id when absent.
 */
export const parseTransactionsCsv = (text: string): CsvParseResult => {
  const rows: CsvTransaction[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { rows, errors: ["The file is empty."] };

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string): number => header.indexOf(name);
  const iDate = col("date");
  const iCoin = col("coin");
  const iSymbol = col("symbol");
  const iName = col("name");
  const iType = col("type");
  const iQty = col("quantity");
  const iAmount = col("amount");
  const iImage = col("image");

  const missing = (
    [
      ["date", iDate],
      ["coin", iCoin],
      ["type", iType],
      ["quantity", iQty],
      ["amount", iAmount],
    ] as const
  )
    .filter(([, idx]) => idx < 0)
    .map(([name]) => name);
  if (missing.length > 0) {
    return {
      rows,
      errors: [`Missing required column(s): ${missing.join(", ")}.`],
    };
  }

  for (let r = 1; r < lines.length; r++) {
    const f = parseCsvLine(lines[r]);
    const rowNo = r + 1; // 1-based, including the header row
    const get = (idx: number): string => (idx >= 0 ? (f[idx] ?? "").trim() : "");

    const coinId = get(iCoin);
    const type = get(iType).toLowerCase();
    const date = parseDate(get(iDate));
    const quantity = Number(get(iQty));
    const amount = Number(get(iAmount));

    if (!coinId) {
      errors.push(`Row ${rowNo}: missing coin id.`);
      continue;
    }
    if (type !== "buy" && type !== "sell") {
      errors.push(`Row ${rowNo}: type must be "buy" or "sell".`);
      continue;
    }
    if (date === null) {
      errors.push(`Row ${rowNo}: invalid date.`);
      continue;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`Row ${rowNo}: quantity must be a positive number.`);
      continue;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      errors.push(`Row ${rowNo}: amount must be zero or more.`);
      continue;
    }

    rows.push({
      coinId,
      symbol: get(iSymbol) || coinId,
      name: get(iName) || coinId,
      image: get(iImage),
      type,
      quantity,
      amount,
      date,
    });
  }

  return { rows, errors };
};
