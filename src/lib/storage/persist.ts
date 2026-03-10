import localforage from "localforage";
import { z } from "zod";

const WATCHLIST_ITEM_SCHEMA = z.object({
  id: z.string(),
  watchlistId: z.string(),
  symbol: z.string(),
  exchange: z.string().optional(),
  displayName: z.string().optional(),
  orderIndex: z.number().int(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

const WATCHLIST_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
  orderIndex: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CHART_PREFS_SCHEMA = z.object({
  timeframe: z.string().default("1D"),
  indicators: z
    .object({
      sma: z.boolean().default(true),
      ema: z.boolean().default(false),
    })
    .default({ sma: true, ema: false }),
});

const APP_SETTINGS_SCHEMA = z.object({
  selectedWatchlistId: z.string().nullable().default(null),
  lastSelectedSymbolByWatchlist: z
    .record(z.string(), z.string())
    .default({}),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  chartPrefs: z.record(z.string(), CHART_PREFS_SCHEMA).default({}),
});

const ROOT_SCHEMA_V1 = z.object({
  schemaVersion: z.literal(1),
  watchlists: z.array(WATCHLIST_SCHEMA),
  items: z.array(WATCHLIST_ITEM_SCHEMA),
  settings: APP_SETTINGS_SCHEMA,
});

export type PersistedRootV1 = z.infer<typeof ROOT_SCHEMA_V1>;

export type PersistedRoot = PersistedRootV1;

const STORAGE_KEY = "portfolio-track/root";

localforage.config({
  name: "portfolio-track",
  storeName: "portfolio_track_store",
  description: "Local-first storage for PortfolioTrack watchlists",
});

async function readRaw(): Promise<unknown | null> {
  try {
    return await localforage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to read from localforage", error);
    return null;
  }
}

async function writeRaw(value: PersistedRoot): Promise<void> {
  try {
    await localforage.setItem(STORAGE_KEY, value);
  } catch (error) {
    console.error("Failed to write to localforage", error);
  }
}

export function createEmptyRoot(): PersistedRoot {
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    watchlists: [
      {
        id: "default",
        name: "Watchlist 1",
        orderIndex: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    items: [],
    settings: {
      selectedWatchlistId: "default",
      lastSelectedSymbolByWatchlist: {},
      theme: "system",
      chartPrefs: {},
    },
  };
}

function migrateToLatest(raw: unknown): PersistedRoot {
  if (!raw) {
    return createEmptyRoot();
  }

  const parsed = ROOT_SCHEMA_V1.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  console.warn("Persisted data did not match v1 schema, resetting.", {
    issues: parsed.error.issues,
  });
  return createEmptyRoot();
}

export const __test__ = {
  migrateToLatest,
};

export async function loadPersistedRoot(): Promise<PersistedRoot> {
  const raw = await readRaw();
  const migrated = migrateToLatest(raw);
  await writeRaw(migrated);
  return migrated;
}

export async function savePersistedRoot(root: PersistedRoot): Promise<void> {
  const parsed = ROOT_SCHEMA_V1.parse(root);
  await writeRaw(parsed);
}

export async function clearPersistedRoot(): Promise<void> {
  try {
    await localforage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear persisted root", error);
  }
}

export async function exportPersistedRoot(): Promise<string> {
  const root = await loadPersistedRoot();
  return JSON.stringify(root, null, 2);
}

export async function importPersistedRoot(json: string): Promise<void> {
  const parsed = JSON.parse(json) as unknown;
  const migrated = migrateToLatest(parsed);
  await writeRaw(migrated);
}

