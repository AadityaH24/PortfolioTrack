export type Timeframe = "1D" | "5D" | "1M" | "3M" | "1Y";

export type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type Quote = {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  timestamp: number; // unix seconds
};

export type SymbolSearchResult = {
  symbol: string;
  name?: string;
  exchange?: string;
};

