"use client";

import { useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearch } from "@/hooks/use-search";
import { usePortfolio } from "@/lib/portfolio";
import type { Transaction, TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CoinRef {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
}

interface TransactionFormProps {
  /** Edit this transaction instead of adding a new one. */
  transaction?: Transaction;
  /** Pre-select a coin (e.g. adding another trade to an existing position). */
  presetCoin?: CoinRef;
  trigger: React.ReactNode;
}

const toDateInput = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

const fromDateInput = (value: string): number =>
  new Date(`${value}T00:00:00`).getTime();

/** Dialog to record or edit a buy/sell transaction. */
export const TransactionForm = ({
  transaction,
  presetCoin,
  trigger,
}: TransactionFormProps): React.ReactNode => {
  const { addTransaction, updateTransaction } = usePortfolio();
  const isEdit = transaction != null;

  const initialCoin: CoinRef | null = transaction
    ? {
        coinId: transaction.coinId,
        symbol: transaction.symbol,
        name: transaction.name,
        image: transaction.image,
      }
    : (presetCoin ?? null);
  const coinLocked = isEdit || presetCoin != null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const { data: results = [], isFetching } = useSearch(debounced);

  const [picked, setPicked] = useState<CoinRef | null>(initialCoin);
  const [type, setType] = useState<TxType>(transaction?.type ?? "buy");
  const [quantity, setQuantity] = useState(
    transaction ? String(transaction.quantity) : "",
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : "",
  );
  // Default date is set when the dialog opens (Date.now() must stay out of render).
  const [date, setDate] = useState(
    transaction ? toDateInput(transaction.date) : "",
  );

  const reset = (): void => {
    if (!coinLocked) setPicked(null);
    if (!isEdit) {
      setType("buy");
      setQuantity("");
      setAmount("");
      setDate("");
    }
    setQuery("");
  };

  const qty = Number(quantity);
  const amt = Number(amount);
  const valid =
    picked != null &&
    qty > 0 &&
    Number.isFinite(qty) &&
    amt >= 0 &&
    Number.isFinite(amt) &&
    date !== "";

  const handleSubmit = (): void => {
    if (!picked || !valid) return;
    if (isEdit) {
      updateTransaction(transaction.id, {
        type,
        quantity: qty,
        amount: amt,
        date: fromDateInput(date),
      });
    } else {
      addTransaction({
        ...picked,
        type,
        quantity: qty,
        amount: amt,
        date: fromDateInput(date),
      });
    }
    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !isEdit && date === "") setDate(toDateInput(Date.now()));
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `Edit ${transaction.name} transaction`
              : "Add transaction"}
          </DialogTitle>
        </DialogHeader>

        {!picked ? (
          <Command shouldFilter={false} className="rounded-lg border">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search a coin…"
            />
            <CommandList>
              <CommandEmpty>
                {query.trim().length < 2
                  ? "Type at least 2 characters."
                  : isFetching
                    ? "Searching…"
                    : "No coins found."}
              </CommandEmpty>
              {results.length > 0 ? (
                <CommandGroup heading="Coins">
                  {results.map((coin) => (
                    <CommandItem
                      key={coin.id}
                      value={coin.id}
                      onSelect={() =>
                        setPicked({
                          coinId: coin.id,
                          symbol: coin.symbol,
                          name: coin.name,
                          image: coin.thumb,
                        })
                      }
                      className="gap-2"
                    >
                      <Image
                        src={coin.thumb}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span className="font-medium">{coin.name}</span>
                      <span className="text-xs uppercase text-muted-foreground">
                        {coin.symbol}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {picked.image ? (
                <Image
                  src={picked.image}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : null}
              <span className="font-medium">{picked.name}</span>
              <span className="text-xs uppercase text-muted-foreground">
                {picked.symbol}
              </span>
              {!coinLocked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setPicked(null)}
                >
                  Change
                </Button>
              ) : null}
            </div>

            <div
              role="group"
              aria-label="Transaction type"
              className="grid grid-cols-2 gap-1 rounded-lg border p-1"
            >
              {(["buy", "sell"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-md py-1 text-sm font-medium capitalize transition-colors pointer-coarse:py-3",
                    type === t
                      ? t === "buy"
                        ? "bg-gain/15 text-gain-ink"
                        : "bg-loss/15 text-loss-ink"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={type === t}
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Quantity</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">
                {type === "buy"
                  ? "Total cost (USD)"
                  : "Total proceeds (USD)"}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Date</span>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={!valid}>
            {isEdit ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
