import type { Metadata } from "next";

type SymbolPageProps = {
  params: {
    symbol: string;
  };
};

export function generateMetadata({ params }: SymbolPageProps): Metadata {
  const symbol = params.symbol.toUpperCase();

  return {
    title: `${symbol} • PortfolioTrack`,
  };
}

export default function SymbolPage({ params }: SymbolPageProps) {
  const symbol = params.symbol.toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:gap-6 md:py-6">
        <aside className="flex w-full flex-shrink-0 flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 md:w-72">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Watchlists
              </h1>
              <p className="text-xs text-zinc-500">
                Select a list to switch the active symbols.
              </p>
            </div>
          </header>
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
            Shared watchlist sidebar
          </div>
        </aside>

        <section className="flex min-h-[60vh] flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-black">
          <header className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {symbol} chart
              </h2>
              <p className="text-xs text-zinc-500">
                Interactive candlestick chart, indicators and tools will render
                here.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Local watchlist • Cloud-ready
            </div>
          </header>
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
            Chart canvas placeholder for {symbol}
          </div>
        </section>
      </main>
    </div>
  );
}

