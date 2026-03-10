export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:gap-6 md:py-6">
        {/* Sidebar placeholder for watchlists */}
        <aside className="flex w-full flex-shrink-0 flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 md:w-72">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Watchlists
              </h1>
              <p className="text-xs text-zinc-500">
                Create lists 1, 2, 3, 4 and pin symbols.
              </p>
            </div>
          </header>
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
            Watchlist UI coming next
          </div>
        </aside>

        {/* Main chart area placeholder */}
        <section className="flex min-h-[60vh] flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-black">
          <header className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Chart
              </h2>
              <p className="text-xs text-zinc-500">
                Select a symbol from the watchlist to see its price action.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Real-time capable
            </div>
          </header>
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
            Candlestick chart and tools will render here.
          </div>
        </section>
      </main>
    </div>
  );
}
