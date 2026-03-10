import { create } from "zustand";
import type { PersistedRoot } from "../lib/storage/persist";

export type Watchlist = PersistedRoot["watchlists"][number];
export type WatchlistItem = PersistedRoot["items"][number];

function nowIso() {
  return new Date().toISOString();
}

function nextWatchlistName(existing: Watchlist[]) {
  const used = new Set(
    existing
      .map((w) => w.name)
      .filter((n) => /^Watchlist\s+\d+$/.test(n))
      .map((n) => Number(n.split(/\s+/)[1])),
  );
  let i = 1;
  while (used.has(i)) i += 1;
  return `Watchlist ${i}`;
}

function normalizeSymbol(input: string) {
  return input.trim().toUpperCase();
}

type AppState = {
  ready: boolean;
  root: PersistedRoot | null;
  setRoot: (updater: (current: PersistedRoot) => PersistedRoot) => void;
  hydrate: (root: PersistedRoot) => void;

  selectWatchlist: (watchlistId: string) => void;
  createWatchlist: () => void;
  renameWatchlist: (watchlistId: string, name: string) => void;
  deleteWatchlist: (watchlistId: string) => void;

  addSymbol: (watchlistId: string, symbol: string) => void;
  removeItem: (itemId: string) => void;
  selectSymbol: (watchlistId: string, symbol: string) => void;
  reorderItems: (watchlistId: string, orderedItemIds: string[]) => void;
};

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  root: null,
  hydrate: (root) => set({ root, ready: true }),
  setRoot: (updater) =>
    set((state) => {
      if (!state.root) return state;
      return { root: updater(state.root) };
    }),

  selectWatchlist: (watchlistId) =>
    set((state) => {
      if (!state.root) return state;
      return {
        root: {
          ...state.root,
          settings: { ...state.root.settings, selectedWatchlistId: watchlistId },
        },
      };
    }),

  createWatchlist: () =>
    set((state) => {
      if (!state.root) return state;
      const id = crypto.randomUUID();
      const now = nowIso();
      const name = nextWatchlistName(state.root.watchlists);
      const nextOrderIndex =
        state.root.watchlists.length === 0
          ? 0
          : Math.max(...state.root.watchlists.map((w) => w.orderIndex)) + 1;
      const watchlists = [
        ...state.root.watchlists,
        {
          id,
          name,
          orderIndex: nextOrderIndex,
          createdAt: now,
          updatedAt: now,
        },
      ];

      return {
        root: {
          ...state.root,
          watchlists,
          settings: { ...state.root.settings, selectedWatchlistId: id },
        },
      };
    }),

  renameWatchlist: (watchlistId, name) =>
    set((state) => {
      if (!state.root) return state;
      const trimmed = name.trim();
      if (!trimmed) return state;
      const now = nowIso();
      return {
        root: {
          ...state.root,
          watchlists: state.root.watchlists.map((w) =>
            w.id === watchlistId ? { ...w, name: trimmed, updatedAt: now } : w,
          ),
        },
      };
    }),

  deleteWatchlist: (watchlistId) =>
    set((state) => {
      if (!state.root) return state;
      const remaining = state.root.watchlists.filter((w) => w.id !== watchlistId);
      if (remaining.length === 0) return state;
      const items = state.root.items.filter((i) => i.watchlistId !== watchlistId);
      const nextSelected =
        state.root.settings.selectedWatchlistId === watchlistId
          ? remaining.slice().sort((a, b) => a.orderIndex - b.orderIndex)[0]?.id ??
            null
          : state.root.settings.selectedWatchlistId;

      const lastSelected = { ...state.root.settings.lastSelectedSymbolByWatchlist };
      delete lastSelected[watchlistId];

      return {
        root: {
          ...state.root,
          watchlists: remaining,
          items,
          settings: {
            ...state.root.settings,
            selectedWatchlistId: nextSelected,
            lastSelectedSymbolByWatchlist: lastSelected,
          },
        },
      };
    }),

  addSymbol: (watchlistId, symbolInput) =>
    set((state) => {
      if (!state.root) return state;
      const symbol = normalizeSymbol(symbolInput);
      if (!symbol) return state;

      const existing = state.root.items.find(
        (i) => i.watchlistId === watchlistId && i.symbol === symbol,
      );
      if (existing) {
        return {
          root: {
            ...state.root,
            settings: {
              ...state.root.settings,
              lastSelectedSymbolByWatchlist: {
                ...state.root.settings.lastSelectedSymbolByWatchlist,
                [watchlistId]: symbol,
              },
            },
          },
        };
      }

      const id = crypto.randomUUID();
      const createdAt = nowIso();
      const nextOrderIndex =
        Math.max(
          -1,
          ...state.root.items
            .filter((i) => i.watchlistId === watchlistId)
            .map((i) => i.orderIndex),
        ) + 1;

      const item: WatchlistItem = {
        id,
        watchlistId,
        symbol,
        orderIndex: nextOrderIndex,
        createdAt,
      };

      return {
        root: {
          ...state.root,
          items: [...state.root.items, item],
          settings: {
            ...state.root.settings,
            lastSelectedSymbolByWatchlist: {
              ...state.root.settings.lastSelectedSymbolByWatchlist,
              [watchlistId]: symbol,
            },
          },
        },
      };
    }),

  removeItem: (itemId) =>
    set((state) => {
      if (!state.root) return state;
      const item = state.root.items.find((i) => i.id === itemId);
      if (!item) return state;
      const items = state.root.items.filter((i) => i.id !== itemId);
      const lastSelected = { ...state.root.settings.lastSelectedSymbolByWatchlist };
      if (lastSelected[item.watchlistId] === item.symbol) {
        delete lastSelected[item.watchlistId];
      }
      return {
        root: {
          ...state.root,
          items,
          settings: {
            ...state.root.settings,
            lastSelectedSymbolByWatchlist: lastSelected,
          },
        },
      };
    }),

  selectSymbol: (watchlistId, symbolInput) =>
    set((state) => {
      if (!state.root) return state;
      const symbol = normalizeSymbol(symbolInput);
      if (!symbol) return state;
      return {
        root: {
          ...state.root,
          settings: {
            ...state.root.settings,
            lastSelectedSymbolByWatchlist: {
              ...state.root.settings.lastSelectedSymbolByWatchlist,
              [watchlistId]: symbol,
            },
          },
        },
      };
    }),

  reorderItems: (watchlistId, orderedItemIds) =>
    set((state) => {
      if (!state.root) return state;
      const idToIndex = new Map<string, number>();
      orderedItemIds.forEach((id, idx) => idToIndex.set(id, idx));
      const items = state.root.items.map((i) => {
        if (i.watchlistId !== watchlistId) return i;
        const idx = idToIndex.get(i.id);
        if (idx === undefined) return i;
        return { ...i, orderIndex: idx };
      });
      return { root: { ...state.root, items } };
    }),
}));

