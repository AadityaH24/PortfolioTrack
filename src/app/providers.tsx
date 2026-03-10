"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { loadPersistedRoot, savePersistedRoot } from "../lib/storage/persist";
import { useAppStore } from "../store/useAppStore";

const queryClient = new QueryClient();

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const hydrate = useAppStore((s) => s.hydrate);
  const root = useAppStore((s) => s.root);
  const ready = useAppStore((s) => s.ready);
  const setRoot = useAppStore((s) => s.setRoot);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    void (async () => {
      const persisted = await loadPersistedRoot();
      hydrate(persisted);
      setBootstrapped(true);
    })();
  }, [hydrate]);

  useEffect(() => {
    if (!ready || !root) return;
    void savePersistedRoot(root);
  }, [ready, root]);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
          Loading local watchlists…
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

