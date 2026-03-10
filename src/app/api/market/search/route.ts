import { NextResponse } from "next/server";
import { yahooMarketProvider } from "../../../../lib/market/provider";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  if (q.trim().length < 1) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  try {
    const results = await yahooMarketProvider.searchSymbols(q);
    return NextResponse.json(
      { results },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "SEARCH_FAILED" },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

