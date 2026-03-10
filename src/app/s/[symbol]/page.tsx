import type { Metadata } from "next";
import { WatchlistSidebar } from "../../../components/WatchlistSidebar";
import { ChartPanel } from "../../../components/ChartPanel";

type SymbolPageParams = {
  symbol: string;
};

type SymbolPageProps = {
  params: Promise<SymbolPageParams>;
};

export async function generateMetadata({
  params,
}: SymbolPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  return {
    title: `${upper} • PortfolioTrack`,
  };
}

export default async function SymbolPage({ params }: SymbolPageProps) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:gap-6 md:py-6">
        <WatchlistSidebar />

        <ChartPanel symbol={upper} />
      </main>
    </div>
  );
}

