import { NextResponse } from "next/server";
import { localCsvMarketProvider } from "../../../../lib/market/localCsvProvider";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") ?? "").trim();
  if (!symbol) {
    return NextResponse.json({ error: "MISSING_SYMBOL" }, { status: 400 });
  }

  try {
    const quote = await localCsvMarketProvider.getQuote(symbol);
    return NextResponse.json(
      { quote },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=5, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "QUOTE_FAILED" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

