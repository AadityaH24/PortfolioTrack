import type { Metadata } from "next";
import { WatchlistSidebar } from "../../../components/WatchlistSidebar";
import { ChartPanel } from "../../../components/ChartPanel";

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
        <WatchlistSidebar />

        <ChartPanel symbol={symbol} />
      </main>
    </div>
  );
}

