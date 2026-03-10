import { create } from "zustand";
import type { PersistedRoot } from "../lib/storage/persist";

export type Watchlist = PersistedRoot["watchlists"][number];
export type WatchlistItem = PersistedRoot["items"][number];

type AppState = {
  ready: boolean;
  root: PersistedRoot | null;
  setRoot: (updater: (current: PersistedRoot) => PersistedRoot) => void;
  hydrate: (root: PersistedRoot) => void;
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
}));

