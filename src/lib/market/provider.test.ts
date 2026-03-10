import { describe, expect, it } from "vitest";
import { yahooMarketProvider } from "./provider";

describe("yahooMarketProvider", () => {
  it("exposes required functions", () => {
    expect(typeof yahooMarketProvider.searchSymbols).toBe("function");
    expect(typeof yahooMarketProvider.getCandles).toBe("function");
    expect(typeof yahooMarketProvider.getQuote).toBe("function");
  });
});

