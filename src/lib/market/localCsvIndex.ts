import fs from "fs/promises";
import path from "path";

export type SymbolMaster = {
  symbol: string;
  isin: string;
  name: string;
  segment: string;
  firstDate: string;
  lastDate: string;
  barCount: number;
};

export type DailyBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Index = {
  symbolMaster: Map<string, SymbolMaster>;
  seriesBySymbol: Map<string, DailyBar[]>;
};

let indexPromise: Promise<Index> | null = null;

export async function getLocalCsvIndex(): Promise<Index> {
  if (!indexPromise) {
    indexPromise = buildIndex();
  }
  return indexPromise;
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function minDate(a: string | null, b: string): string {
  if (!a) return b;
  return a < b ? a : b;
}

function maxDate(a: string | null, b: string): string {
  if (!a) return b;
  return a > b ? a : b;
}

async function buildIndex(): Promise<Index> {
  const dataDir = path.join(process.cwd(), "data");
  let fileNames: string[] = [];

  try {
    const entries = await fs.readdir(dataDir);
    fileNames = entries.filter((f) => f.toLowerCase().endsWith(".csv")).sort();
  } catch {
    // No data directory or files; return empty index.
    return {
      symbolMaster: new Map(),
      seriesBySymbol: new Map(),
    };
  }

  const symbolMaster = new Map<string, SymbolMaster>();
  const seriesBySymbol = new Map<string, DailyBar[]>();

  for (const fileName of fileNames) {
    const fullPath = path.join(dataDir, fileName);
    let content: string;
    try {
      content = await fs.readFile(fullPath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    if (lines.length <= 1) continue;

    const header = lines[0]!.split(",");
    const colIndex = createHeaderIndex(header);
    if (!colIndex) continue;

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const cols = line.split(",");
      if (cols.length < header.length) continue;

      const segment = cols[colIndex.Sgmt] ?? "";
      const finType = cols[colIndex.FinInstrmTp] ?? "";
      if (segment !== "CM" || finType !== "STK") continue;

      const bizDt = (cols[colIndex.BizDt] ?? "").trim();
      const symbol = (cols[colIndex.TckrSymb] ?? "").trim().toUpperCase();
      if (!bizDt || !symbol) continue;

      const isin = (cols[colIndex.ISIN] ?? "").trim();
      const name = (cols[colIndex.FinInstrmNm] ?? "").trim();

      const open = toNumber(cols[colIndex.OpnPric] ?? "");
      const high = toNumber(cols[colIndex.HghPric] ?? "");
      const low = toNumber(cols[colIndex.LwPric] ?? "");
      const close = toNumber(cols[colIndex.ClsPric] ?? "");
      const volume = toNumber(cols[colIndex.TtlTradgVol] ?? "");

      if (
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        volume == null
      ) {
        continue;
      }

      const existingBars = seriesBySymbol.get(symbol) ?? [];
      existingBars.push({
        date: bizDt,
        open,
        high,
        low,
        close,
        volume,
      });
      seriesBySymbol.set(symbol, existingBars);

      const existingMaster = symbolMaster.get(symbol);
      const firstDate = minDate(existingMaster?.firstDate ?? null, bizDt);
      const lastDate = maxDate(existingMaster?.lastDate ?? null, bizDt);
      const segmentLabel = "BSE_CM";

      symbolMaster.set(symbol, {
        symbol,
        isin,
        name,
        segment: segmentLabel,
        firstDate,
        lastDate,
        barCount: (existingMaster?.barCount ?? 0) + 1,
      });
    }
  }

  // Sort bars by date for each symbol.
  for (const [symbol, bars] of seriesBySymbol.entries()) {
    bars.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    seriesBySymbol.set(symbol, bars);
    const master = symbolMaster.get(symbol);
    if (master) {
      symbolMaster.set(symbol, { ...master, barCount: bars.length });
    }
  }

  return { symbolMaster, seriesBySymbol };
}

type HeaderIndex = {
  TradDt: number;
  BizDt: number;
  Sgmt: number;
  Src: number;
  FinInstrmTp: number;
  FinInstrmId: number;
  ISIN: number;
  TckrSymb: number;
  FinInstrmNm: number;
  OpnPric: number;
  HghPric: number;
  LwPric: number;
  ClsPric: number;
  TtlTradgVol: number;
};

function createHeaderIndex(header: string[]): HeaderIndex | null {
  const required = [
    "TradDt",
    "BizDt",
    "Sgmt",
    "Src",
    "FinInstrmTp",
    "FinInstrmId",
    "ISIN",
    "TckrSymb",
    "FinInstrmNm",
    "OpnPric",
    "HghPric",
    "LwPric",
    "ClsPric",
    "TtlTradgVol",
  ] as const;

  const index: Partial<Record<(typeof required)[number], number>> = {};
  for (let i = 0; i < header.length; i += 1) {
    const name = header[i]!.trim();
    if (required.includes(name as (typeof required)[number])) {
      index[name as (typeof required)[number]] = i;
    }
  }

  for (const key of required) {
    if (typeof index[key] !== "number") {
      return null;
    }
  }

  return index as HeaderIndex;
}

