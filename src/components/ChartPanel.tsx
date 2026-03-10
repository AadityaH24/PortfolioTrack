"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineData,
  LineStyle,
  createChart,
} from "lightweight-charts";
import type { Candle, Timeframe } from "../lib/market/types";
import { useAppStore } from "../store/useAppStore";

type ChartPanelProps = {
  symbol: string | null;
};

type CandleResponse = {
  candles: Candle[];
};

const TIMEFRAMES: Timeframe[] = ["1D", "5D", "1M", "3M", "1Y"];

function formatPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function ChartPanel({ symbol }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const overlayRef = useRef<ISeriesApi<"Line"> | null>(null);
  const trendRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<{ time?: number; close?: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<"sma" | "ema">("sma");
  const trendDraftRef = useRef<{
    a?: { time: number; value: number };
    b?: { time: number; value: number };
  }>({});

  const root = useAppStore((s) => s.root);
  const setRoot = useAppStore((s) => s.setRoot);

  const title = useMemo(() => (symbol ? symbol.toUpperCase() : "Chart"), [symbol]);

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a1a1aa",
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(161,161,170,0.08)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { labelVisible: true, style: LineStyle.Dotted },
        horzLine: { labelVisible: true, style: LineStyle.Dotted },
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const overlay = chart.addLineSeries({
      color: "#60a5fa",
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const trend = chart.addLineSeries({
      color: "rgba(250,204,21,0.95)",
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      lineStyle: LineStyle.Solid,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    overlayRef.current = overlay;
    trendRef.current = trend;

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      chart.timeScale().fitContent();
    });
    resizeObserver.observe(el);

    const unsub = chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHover({});
        return;
      }
      const bar = param.seriesData.get(series) as
        | { close?: number; open?: number; high?: number; low?: number }
        | undefined;
      setHover({ time: Number(param.time), close: bar?.close });
    });

    chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(unsub);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      overlayRef.current = null;
      trendRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Load persisted chart prefs when symbol changes.
    if (!symbol || !root) return;
    const pref = root.settings.chartPrefs[symbol.toUpperCase()];
    if (pref?.timeframe) setTimeframe(pref.timeframe as Timeframe);
    const useEma = pref?.indicators?.ema ?? false;
    const useSma = pref?.indicators?.sma ?? true;
    setIndicator(useEma && !useSma ? "ema" : "sma");
  }, [root, symbol]);

  useEffect(() => {
    // Persist chart prefs (timeframe + indicator toggles) per symbol.
    if (!symbol || !root) return;
    const key = symbol.toUpperCase();
    setRoot((current) => {
      const prev = current.settings.chartPrefs[key] ?? { timeframe: "1D", indicators: { sma: true, ema: false } };
      const next = {
        ...prev,
        timeframe,
        indicators:
          indicator === "sma"
            ? { sma: true, ema: false }
            : { sma: false, ema: true },
      };
      return {
        ...current,
        settings: {
          ...current.settings,
          chartPrefs: { ...current.settings.chartPrefs, [key]: next },
        },
      };
    });
  }, [indicator, root, setRoot, symbol, timeframe]);

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/market/candles?symbol=${encodeURIComponent(
            symbol,
          )}&timeframe=${encodeURIComponent(timeframe)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`Candles HTTP ${res.status}`);
        const json = (await res.json()) as CandleResponse;
        const candles = json.candles ?? [];
        seriesRef.current?.setData(
          candles.map((c) => ({
            time: c.time as never,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );

        // Indicator: compute SMA/EMA of close, render as line overlay.
        const closes = candles.map((c) => ({ time: c.time, value: c.close }));
        const period = Math.min(20, Math.max(5, Math.floor(closes.length / 12)));
        const lineData: LineData[] =
          indicator === "sma"
            ? computeSma(closes, period)
            : computeEma(closes, period);
        overlayRef.current?.setData(lineData as never);

        chartRef.current?.timeScale().fitContent();
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        setError("Failed to load candles (rate limit or symbol not found).");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [indicator, symbol, timeframe]);

  useEffect(() => {
    // Trendline drawing: click twice to set endpoints on current close.
    if (!symbol) return;
    const chart = chartRef.current;
    const series = seriesRef.current;
    const trend = trendRef.current;
    if (!chart || !series || !trend) return;

    const handler = (param: Parameters<IChartApi["subscribeClick"]>[0]) => {
      if (!param.time) return;
      const bar = param.seriesData.get(series) as
        | { close?: number }
        | undefined;
      const value = bar?.close;
      if (value == null) return;

      const prev = trendDraftRef.current;
      if (!prev.a) {
        trend.setData([{ time: param.time as never, value }] as never);
        trendDraftRef.current = { a: { time: Number(param.time), value } };
        return;
      }
      if (!prev.b) {
        const a = prev.a;
        const b = { time: Number(param.time), value };
        trend.setData(
          [
            { time: a.time as never, value: a.value },
            { time: b.time as never, value: b.value },
          ] as never,
        );
        trendDraftRef.current = { a, b };
        return;
      }
      // third click resets
      trend.setData([] as never);
      trendDraftRef.current = {};
    };

    chart.subscribeClick(handler);
    return () => chart.unsubscribeClick(handler);
  }, [symbol]);

  return (
    <section className="flex min-h-[60vh] flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-black">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <p className="text-xs text-zinc-500">
            {symbol
              ? "Zoom/pan, crosshair, timeframe + SMA/EMA + trendline."
              : "Select a symbol from the watchlist to load candles."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            Hover close: <span className="font-semibold">{formatPrice(hover.close)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={[
                "h-8 rounded-lg border px-2 text-[11px] font-semibold shadow-sm",
                indicator === "sma"
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-950",
              ].join(" ")}
              onClick={() => setIndicator("sma")}
              disabled={!symbol}
              aria-label="Toggle SMA"
            >
              SMA
            </button>
            <button
              type="button"
              className={[
                "h-8 rounded-lg border px-2 text-[11px] font-semibold shadow-sm",
                indicator === "ema"
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-950",
              ].join(" ")}
              onClick={() => setIndicator("ema")}
              disabled={!symbol}
              aria-label="Toggle EMA"
            >
              EMA
            </button>
          </div>
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                className={[
                  "h-8 rounded-lg border px-2 text-[11px] font-semibold shadow-sm",
                  tf === timeframe
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-950",
                ].join(" ")}
                onClick={() => setTimeframe(tf)}
                disabled={!symbol}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="relative flex-1">
        <div
          ref={containerRef}
          className="h-full w-full rounded-lg border border-zinc-200 bg-zinc-950/0 dark:border-zinc-800"
        />

        {!symbol ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
              Pick a symbol from the sidebar.
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
              Loading candles…
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 shadow-sm dark:text-red-300">
              {error}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function computeSma(
  points: Array<{ time: number; value: number }>,
  period: number,
): LineData[] {
  const out: LineData[] = [];
  if (period <= 1) return points.map((p) => ({ time: p.time as never, value: p.value }));
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    sum += points[i]!.value;
    if (i >= period) sum -= points[i - period]!.value;
    if (i >= period - 1) {
      out.push({ time: points[i]!.time as never, value: sum / period });
    }
  }
  return out;
}

function computeEma(
  points: Array<{ time: number; value: number }>,
  period: number,
): LineData[] {
  const out: LineData[] = [];
  if (points.length === 0) return out;
  const k = 2 / (period + 1);
  let ema = points[0]!.value;
  for (let i = 0; i < points.length; i += 1) {
    const v = points[i]!.value;
    ema = i === 0 ? v : v * k + ema * (1 - k);
    if (i >= period - 1) {
      out.push({ time: points[i]!.time as never, value: ema });
    }
  }
  return out;
}

