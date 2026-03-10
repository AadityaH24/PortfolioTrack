import type { MarketProvider } from "./provider";
import type {
  Candle,
  Quote,
  SymbolSearchResult,
  Timeframe,
} from "./types";
import { getLocalCsvIndex } from "./localCsvIndex";

function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase();
}

function timeframeToLookback(timeframe: Timeframe): number {
  switch (timeframe) {
    case "1D":
      return 1;
    case "5D":
      return 5;
    case "1M":
      return 22; // ~1 trading month
    case "3M":
      return 66;
    case "1Y":
      return 252;
    default:
      return 120;
  }
}

export const localCsvMarketProvider: MarketProvider = {
  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const { symbolMaster } = await getLocalCsvIndex();
    const upper = q.toUpperCase();

    const results: Array<SymbolSearchResult & { score: number }> = [];

    for (const master of symbolMaster.values()) {
      if (master.barCount <= 0) continue;
      const symbolUpper = master.symbol.toUpperCase();
      const nameUpper = master.name.toUpperCase();

      let score = 0;
      if (symbolUpper === upper) score = 100;
      else if (symbolUpper.startsWith(upper)) score = 80;
      else if (symbolUpper.includes(upper)) score = 60;
      else if (nameUpper.startsWith(upper)) score = 40;
      else if (nameUpper.includes(upper)) score = 20;

      if (score === 0) continue;

      // Slightly prefer symbols with more data.
      score += Math.min(10, Math.floor(master.barCount / 10));

      results.push({
        symbol: master.symbol,
        name: master.name,
        exchange: master.segment,
        score,
      });
    }

    return results
      .sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol))
      .slice(0, 20)
      .map((r) => ({
        symbol: r.symbol,
        name: r.name,
        exchange: r.exchange,
      }));
  },

  async getCandles(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
    const normalized = normalizeSymbol(symbol);
    const { seriesBySymbol } = await getLocalCsvIndex();
    const series = seriesBySymbol.get(normalized);
    if (!series || series.length === 0) return [];

    const lookback = timeframeToLookback(timeframe);
    const slice =
      lookback >= series.length ? series : series.slice(series.length - lookback);

    return slice.map((bar) => ({
      time: Math.floor(Date.parse(bar.date) / 1000),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));
  },

  async getQuote(symbol: string): Promise<Quote> {
    const normalized = normalizeSymbol(symbol);
    const { seriesBySymbol } = await getLocalCsvIndex();
    const series = seriesBySymbol.get(normalized);
    if (!series || series.length === 0) {
      throw new Error(`No local data for symbol ${normalized}`);
    }

    const last = series[series.length - 1]!;
    const prev = series[series.length - 2];

    const price = last.close;
    const prevClose = prev?.close ?? price;
    const change = price - prevClose;
    const changePercent =
      prevClose === 0 ? undefined : (change / prevClose) * 100;

    const time = Math.floor(Date.parse(last.date) / 1000);

    return {
      symbol: normalized,
      price,
      change,
      changePercent,
      timestamp: time,
    };
  },
};

