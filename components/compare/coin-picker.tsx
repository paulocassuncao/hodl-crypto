"use client";

import { useState } from "react";
import { CoinIcon } from "@/components/coin-icon";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearch } from "@/hooks/use-search";
import { MAX_COMPARE } from "@/lib/compare";

export interface PickerCoin {
  id: string;
  symbol: string;
  name: string;
}

interface CoinPickerProps {
  selected: PickerCoin[];
  onAdd: (coin: PickerCoin) => void;
  onRemove: (id: string) => void;
}

/** Chips for the selected coins plus a searchable dialog to add more. */
export const CoinPicker = ({
  selected,
  onAdd,
  onRemove,
}: CoinPickerProps): React.ReactNode => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: results = [], isFetching } = useSearch(query);

  const canAdd = selected.length < MAX_COMPARE;
  const selectedIds = new Set(selected.map((c) => c.id));

  const handleSelect = (coin: PickerCoin): void => {
    if (!selectedIds.has(coin.id)) onAdd(coin);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((coin) => (
        <span
          key={coin.id}
          className="inline-flex items-center gap-1.5 rounded-full glass-panel py-1 pl-3 pr-1.5 text-sm"
        >
          <span className="font-medium">{coin.name}</span>
          <span className="text-xs uppercase text-muted-foreground">
            {coin.symbol}
          </span>
          <button
            type="button"
            onClick={() => onRemove(coin.id)}
            aria-label={`Remove ${coin.name}`}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={!canAdd}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add coin
      </Button>
      {!canAdd ? (
        <span className="text-xs text-muted-foreground">
          Max {MAX_COMPARE} coins
        </span>
      ) : null}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search a coin to compare…"
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
                    disabled={selectedIds.has(coin.id)}
                    onSelect={() =>
                      handleSelect({
                        id: coin.id,
                        symbol: coin.symbol,
                        name: coin.name,
                      })
                    }
                    className="gap-2"
                  >
                    <CoinIcon src={coin.thumb} size={20} />
                    <span className="font-medium">{coin.name}</span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {coin.symbol}
                    </span>
                    {selectedIds.has(coin.id) ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Added
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
};
