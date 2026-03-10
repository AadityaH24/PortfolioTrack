import { afterEach, describe, expect, it, vi } from "vitest";
import { localCsvMarketProvider } from "./localCsvProvider";
import type { DailyBar, SymbolMaster } from "./localCsvIndex";

vi.mock("./localCsvIndex", () => {
  const symbolMaster = new Map<string, SymbolMaster>();
  const seriesBySymbol = new Map<string, DailyBar[]>();

  symbolMaster.set("DUMMY", {
    symbol: "DUMMY",
    isin: "INEDUMMY0001",
    name: "Dummy Corp",
    segment: "BSE_CM",
    firstDate: "2026-03-02",
    lastDate: "2026-03-06",
    barCount: 3,
  });

  seriesBySymbol.set("DUMMY", [
    {
      date: "2026-03-02",
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 10_000,
    },
    {
      date: "2026-03-04",
      open: 106,
      high: 120,
      low: 100,
      close: 115,
      volume: 12_000,
    },
    {
      date: "2026-03-06",
      open: 116,
      high: 130,
      low: 110,
      close: 125,
      volume: 14_000,
    },
  ]);

  return {
    getLocalCsvIndex: vi.fn(async () => ({
      symbolMaster,
      seriesBySymbol,
    })),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("localCsvMarketProvider", () => {
  it("searchSymbols returns dummy symbol for matching query", async () => {
    const results = await localCsvMarketProvider.searchSymbols("dum");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.symbol).toBe("DUMMY");
    expect(results[0]?.name).toBe("Dummy Corp");
  });

  it("getCandles returns daily candles clipped by timeframe", async () => {
    const candles1D = await localCsvMarketProvider.getCandles("DUMMY", "1D");
    expect(candles1D).toHaveLength(1);
    expect(candles1D[0]?.close).toBe(125);

    const candles5D = await localCsvMarketProvider.getCandles("DUMMY", "5D");
    expect(candles5D).toHaveLength(3);
    expect(candles5D[0]?.open).toBe(100);
    expect(candles5D[2]?.close).toBe(125);
  });

  it("getQuote derives price and change from last two bars", async () => {
    const quote = await localCsvMarketProvider.getQuote("DUMMY");
    expect(quote.symbol).toBe("DUMMY");
    expect(quote.price).toBe(125);
    // Previous close 115 -> change 10
    expect(quote.change).toBeCloseTo(10);
    expect(quote.changePercent).toBeCloseTo((10 / 115) * 100);
  });
});

