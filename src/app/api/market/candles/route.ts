import { NextResponse } from "next/server";
import { z } from "zod";
import { yahooMarketProvider } from "../../../../lib/market/provider";

const TF = z.enum(["1D", "5D", "1M", "3M", "1Y"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") ?? "").trim();
  const timeframeRaw = url.searchParams.get("timeframe") ?? "1D";
  const timeframeParsed = TF.safeParse(timeframeRaw);

  if (!symbol) {
    return NextResponse.json({ error: "MISSING_SYMBOL" }, { status: 400 });
  }
  if (!timeframeParsed.success) {
    return NextResponse.json({ error: "INVALID_TIMEFRAME" }, { status: 400 });
  }

  try {
    const candles = await yahooMarketProvider.getCandles(
      symbol,
      timeframeParsed.data,
    );
    return NextResponse.json(
      { candles },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "CANDLES_FAILED" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

