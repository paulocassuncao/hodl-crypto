"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearch } from "@/hooks/use-search";

/** Header search button that opens a ⌘K command palette searching all coins. */
export const SearchTrigger = (): React.ReactNode => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const { data: results = [], isFetching } = useSearch(debounced);

  // Global ⌘K / Ctrl+K shortcut to open the palette.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const goTo = (id: string): void => {
    setOpen(false);
    setQuery("");
    router.push(`/coins/${id}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Search coins"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search any coin…"
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
                    onSelect={() => goTo(coin.id)}
                    className="gap-2"
                  >
                    <Image
                      src={coin.thumb}
                      alt=""
                      width={20}
                      height={20}
                      className="rounded-full"
                      unoptimized
                    />
                    <span className="font-medium">{coin.name}</span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {coin.symbol}
                    </span>
                    {coin.market_cap_rank ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        #{coin.market_cap_rank}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};
