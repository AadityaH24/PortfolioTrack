import { z } from "zod";
import type { Candle, Quote, SymbolSearchResult, Timeframe } from "./types";

export type MarketProvider = {
  searchSymbols: (query: string) => Promise<SymbolSearchResult[]>;
  getCandles: (symbol: string, timeframe: Timeframe) => Promise<Candle[]>;
  getQuote: (symbol: string) => Promise<Quote>;
};

const TIMEFRAME_TO_RANGE: Record<Timeframe, { range: string; interval: string }> =
  {
    "1D": { range: "1d", interval: "5m" },
    "5D": { range: "5d", interval: "15m" },
    "1M": { range: "1mo", interval: "1h" },
    "3M": { range: "3mo", interval: "1d" },
    "1Y": { range: "1y", interval: "1d" },
  };

const YahooChartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({
            quote: z.array(
              z.object({
                open: z.array(z.number().nullable()).optional(),
                high: z.array(z.number().nullable()).optional(),
                low: z.array(z.number().nullable()).optional(),
                close: z.array(z.number().nullable()).optional(),
                volume: z.array(z.number().nullable()).optional(),
              }),
            ),
          }),
        }),
      )
      .nullable(),
    error: z.unknown().nullable().optional(),
  }),
});

const YahooQuoteSchema = z.object({
  quoteResponse: z.object({
    result: z
      .array(
        z.object({
          symbol: z.string(),
          regularMarketPrice: z.number().nullable().optional(),
          regularMarketChange: z.number().nullable().optional(),
          regularMarketChangePercent: z.number().nullable().optional(),
          regularMarketTime: z.number().nullable().optional(),
        }),
      )
      .optional()
      .default([]),
  }),
});

const YahooSearchSchema = z.object({
  quotes: z
    .array(
      z.object({
        symbol: z.string(),
        shortname: z.string().optional(),
        longname: z.string().optional(),
        exchange: z.string().optional(),
        quoteType: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

function yahooBase() {
  // Unauthenticated, but can be rate-limited; we proxy through Next routes anyway.
  return "https://query1.finance.yahoo.com";
}

export const yahooMarketProvider: MarketProvider = {
  async searchSymbols(query) {
    const q = query.trim();
    if (!q) return [];
    const url = `${yahooBase()}/v1/finance/search?q=${encodeURIComponent(
      q,
    )}&quotesCount=8&newsCount=0`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Yahoo search failed: ${res.status}`);
    const json = YahooSearchSchema.parse(await res.json());
    return json.quotes
      .filter((r) => r.symbol && (r.quoteType ? r.quoteType !== "CRYPTOCURRENCY" : true))
      .map((r) => ({
        symbol: r.symbol,
        name: r.longname ?? r.shortname,
        exchange: r.exchange,
      }));
  },

  async getCandles(symbol, timeframe) {
    const { range, interval } = TIMEFRAME_TO_RANGE[timeframe];
    const url = `${yahooBase()}/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?range=${range}&interval=${interval}&includePrePost=false`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Yahoo chart failed: ${res.status}`);
    const json = YahooChartSchema.parse(await res.json());
    const result = json.chart.result?.[0];
    const ts = result?.timestamp ?? [];
    const q = result?.indicators.quote?.[0];
    const open = q?.open ?? [];
    const high = q?.high ?? [];
    const low = q?.low ?? [];
    const close = q?.close ?? [];
    const volume = q?.volume ?? [];

    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i += 1) {
      const o = open[i];
      const h = high[i];
      const l = low[i];
      const c = close[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({
        time: ts[i]!,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: volume[i] ?? undefined,
      });
    }
    return candles;
  },

  async getQuote(symbol) {
    const url = `${yahooBase()}/v7/finance/quote?symbols=${encodeURIComponent(
      symbol,
    )}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Yahoo quote failed: ${res.status}`);
    const json = YahooQuoteSchema.parse(await res.json());
    const q = json.quoteResponse.result[0];
    if (!q?.regularMarketPrice || !q.regularMarketTime) {
      throw new Error("Yahoo quote missing fields");
    }
    return {
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? undefined,
      changePercent: q.regularMarketChangePercent ?? undefined,
      timestamp: q.regularMarketTime,
    };
  },
};

