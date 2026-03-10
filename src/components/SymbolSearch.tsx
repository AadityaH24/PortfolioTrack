"use client";

import { useEffect, useState } from "react";

type Result = {
  symbol: string;
  name?: string;
  exchange?: string;
};

type SymbolSearchProps = {
  disabled?: boolean;
  onSelect: (symbol: string) => void;
};

export function SymbolSearch({ disabled, onSelect }: SymbolSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await fetch(
            `/api/market/search?q=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          );
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const json = (await res.json()) as { results?: Result[] };
          setResults(json.results ?? []);
        } catch (e) {
          if ((e as { name?: string }).name === "AbortError") return;
          setError("Search failed");
          setResults([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 250);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative w-full">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search symbol (e.g., ABB, BAJFINANCE)"
        className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500/60 dark:border-zinc-800 dark:bg-black dark:text-zinc-50"
        disabled={disabled}
      />
      {loading ? (
        <div className="absolute right-2 top-1.5 text-[10px] text-zinc-400">
          …
        </div>
      ) : null}
      {error ? (
        <div className="mt-1 text-[10px] text-red-500">{error}</div>
      ) : null}
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white text-xs shadow-lg dark:border-zinc-800 dark:bg-black">
          {results.map((r) => (
            <button
              key={r.symbol}
              type="button"
              className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
              onClick={() => {
                onSelect(r.symbol);
                setQuery("");
                setResults([]);
              }}
            >
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {r.symbol}
              </span>
              <span className="flex-1 truncate text-[11px] text-zinc-500">
                {r.name}
              </span>
              {r.exchange ? (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                  {r.exchange}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

