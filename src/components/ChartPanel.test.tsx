import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ChartPanel } from "./ChartPanel";

vi.mock("lightweight-charts", () => {
  const noop = () => {};
  const seriesMock = {
    setData: vi.fn(),
  };

  const chartMock = {
    addSeries: vi.fn(() => seriesMock),
    addLineSeries: vi.fn(() => seriesMock),
    subscribeCrosshairMove: vi.fn(() => noop),
    unsubscribeCrosshairMove: vi.fn(),
    subscribeClick: vi.fn(),
    unsubscribeClick: vi.fn(),
    applyOptions: vi.fn(),
    timeScale: () => ({ fitContent: vi.fn() }),
    remove: vi.fn(),
  };

  return {
    ColorType: { Solid: "solid" },
    CrosshairMode: { Normal: "normal" },
    LineStyle: { Dotted: 0, Solid: 1 },
    CandlestickSeries: "CandlestickSeries",
    LineSeries: "LineSeries",
    createChart: vi.fn(() => chartMock),
  };
});

beforeAll(() => {
  // jsdom doesn't implement ResizeObserver by default.
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    };

  // Stub fetch to return a simple candle series.
  global.fetch = vi.fn(async () => {
    return {
      ok: true,
      json: async () => ({
        candles: [
          { time: 1_700_000_000, open: 100, high: 110, low: 90, close: 105 },
          { time: 1_700_086_400, open: 106, high: 120, low: 100, close: 115 },
        ],
      }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
});

describe("ChartPanel", () => {
  it("renders without throwing and requests candles for a symbol", async () => {
    render(<ChartPanel symbol="DUMMY" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

