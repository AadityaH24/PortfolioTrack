"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "../store/useAppStore";
import { SymbolSearch } from "./SymbolSearch";

type SortableRowProps = {
  id: string;
  active: boolean;
  symbol: string;
  indexLabel: number;
  onSelect: () => void;
  onRemove: () => void;
};

function SortableRow({
  id,
  active,
  symbol,
  indexLabel,
  onSelect,
  onRemove,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group flex items-center gap-2 rounded-lg border px-2 py-2 text-xs shadow-sm",
        active
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-950",
        isDragging ? "opacity-70" : "",
      ].join(" ")}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={onSelect}
      >
        <span className="inline-flex w-6 flex-none items-center justify-center rounded-md bg-zinc-100 py-1 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {indexLabel}
        </span>
        <span className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
          {symbol}
        </span>
      </button>

      <button
        type="button"
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-50 group-hover:opacity-100 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-950"
        onClick={onRemove}
        aria-label={`Remove ${symbol}`}
      >
        Remove
      </button>

      <button
        type="button"
        className="cursor-grab rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] text-zinc-600 opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100 dark:border-zinc-800 dark:bg-black dark:text-zinc-300"
        aria-label={`Drag ${symbol}`}
        {...attributes}
        {...listeners}
      >
        Drag
      </button>
    </div>
  );
}

export function WatchlistSidebar() {
  const router = useRouter();
  const root = useAppStore((s) => s.root);
  const ready = useAppStore((s) => s.ready);
  const createWatchlist = useAppStore((s) => s.createWatchlist);
  const renameWatchlist = useAppStore((s) => s.renameWatchlist);
  const deleteWatchlist = useAppStore((s) => s.deleteWatchlist);
  const selectWatchlist = useAppStore((s) => s.selectWatchlist);
  const addSymbol = useAppStore((s) => s.addSymbol);
  const removeItem = useAppStore((s) => s.removeItem);
  const reorderItems = useAppStore((s) => s.reorderItems);
  const selectSymbol = useAppStore((s) => s.selectSymbol);

  const [symbolDraft, setSymbolDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { watchlists, selectedWatchlistId, items, activeSymbol } = useMemo(() => {
    const watchlistsSorted = (root?.watchlists ?? [])
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const selectedId = root?.settings.selectedWatchlistId ?? null;
    const active = selectedId
      ? root?.settings.lastSelectedSymbolByWatchlist[selectedId] ?? null
      : null;
    const itemsForSelected = selectedId
      ? (root?.items ?? [])
          .filter((i) => i.watchlistId === selectedId)
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
      : [];
    return {
      watchlists: watchlistsSorted,
      selectedWatchlistId: selectedId,
      items: itemsForSelected,
      activeSymbol: active,
    };
  }, [root]);

  const selectedWatchlist = watchlists.find((w) => w.id === selectedWatchlistId) ?? null;

  if (!ready || !root) {
    return (
      <aside className="flex w-full flex-shrink-0 flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 md:w-72">
        <div className="h-6 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </aside>
    );
  }

  // Mobile: render as collapsible panel; desktop: fixed sidebar.
  // Keeping it simple: <details> provides a11y-friendly disclosure without extra deps.
  return (
    <>
      <details className="group rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Watchlists
            </div>
            <div className="truncate text-xs text-zinc-500">
              {selectedWatchlist?.name ?? "—"} • {items.length} symbols
            </div>
          </div>
          <div className="text-xs text-zinc-500 group-open:rotate-180">▾</div>
        </summary>
        <div className="mt-3">
          <SidebarInner
            watchlists={watchlists}
            selectedWatchlist={selectedWatchlist}
            selectedWatchlistId={selectedWatchlistId}
            items={items}
            activeSymbol={activeSymbol}
            symbolDraft={symbolDraft}
            setSymbolDraft={setSymbolDraft}
            renaming={renaming}
            setRenaming={setRenaming}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            createWatchlist={createWatchlist}
            renameWatchlist={renameWatchlist}
            deleteWatchlist={deleteWatchlist}
            selectWatchlist={selectWatchlist}
            addSymbol={addSymbol}
            removeItem={removeItem}
            reorderItems={reorderItems}
            selectSymbol={selectSymbol}
            routerPush={(path) => router.push(path)}
            sensors={sensors}
          />
        </div>
      </details>

      <aside className="hidden w-72 flex-shrink-0 md:block">
        <div className="flex h-full flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <SidebarInner
            watchlists={watchlists}
            selectedWatchlist={selectedWatchlist}
            selectedWatchlistId={selectedWatchlistId}
            items={items}
            activeSymbol={activeSymbol}
            symbolDraft={symbolDraft}
            setSymbolDraft={setSymbolDraft}
            renaming={renaming}
            setRenaming={setRenaming}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            createWatchlist={createWatchlist}
            renameWatchlist={renameWatchlist}
            deleteWatchlist={deleteWatchlist}
            selectWatchlist={selectWatchlist}
            addSymbol={addSymbol}
            removeItem={removeItem}
            reorderItems={reorderItems}
            selectSymbol={selectSymbol}
            routerPush={(path) => router.push(path)}
            sensors={sensors}
          />
        </div>
      </aside>
    </>
  );
}

type SidebarInnerProps = {
  watchlists: Array<{ id: string; name: string }>;
  selectedWatchlist: { id: string; name: string } | null;
  selectedWatchlistId: string | null;
  items: Array<{ id: string; symbol: string }>;
  activeSymbol: string | null;
  symbolDraft: string;
  setSymbolDraft: (v: string) => void;
  renaming: boolean;
  setRenaming: (v: boolean) => void;
  nameDraft: string;
  setNameDraft: (v: string) => void;
  createWatchlist: () => void;
  renameWatchlist: (id: string, name: string) => void;
  deleteWatchlist: (id: string) => void;
  selectWatchlist: (id: string) => void;
  addSymbol: (watchlistId: string, symbol: string) => void;
  removeItem: (itemId: string) => void;
  reorderItems: (watchlistId: string, orderedIds: string[]) => void;
  selectSymbol: (watchlistId: string, symbol: string) => void;
  routerPush: (path: string) => void;
  sensors: ReturnType<typeof useSensors>;
};

function SidebarInner({
  watchlists,
  selectedWatchlist,
  selectedWatchlistId,
  items,
  activeSymbol,
  symbolDraft,
  setSymbolDraft,
  renaming,
  setRenaming,
  nameDraft,
  setNameDraft,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  selectWatchlist,
  addSymbol,
  removeItem,
  reorderItems,
  selectSymbol,
  routerPush,
  sensors,
}: SidebarInnerProps) {
  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Watchlists
          </h1>
          <p className="text-xs text-zinc-500">Persisted locally (IndexedDB)</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-950"
          onClick={() => createWatchlist()}
        >
          New
        </button>
      </header>

      <div className="flex items-center gap-2">
        <select
          className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 shadow-sm outline-none focus:border-emerald-500/60 dark:border-zinc-800 dark:bg-black dark:text-zinc-50"
          value={selectedWatchlistId ?? ""}
          onChange={(e) => selectWatchlist(e.target.value)}
          aria-label="Select watchlist"
        >
          {watchlists.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-950"
          onClick={() => {
            if (!selectedWatchlist) return;
            setRenaming((v) => !v);
            setNameDraft(selectedWatchlist.name);
          }}
          disabled={!selectedWatchlist}
        >
          Rename
        </button>

        <button
          type="button"
          className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-950"
          onClick={() => {
            if (!selectedWatchlist) return;
            deleteWatchlist(selectedWatchlist.id);
          }}
          disabled={!selectedWatchlist || watchlists.length <= 1}
        >
          Delete
        </button>
      </div>

      {renaming && selectedWatchlist ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            renameWatchlist(selectedWatchlist.id, nameDraft);
            setRenaming(false);
          }}
        >
          <input
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 shadow-sm outline-none focus:border-emerald-500/60 dark:border-zinc-800 dark:bg-black dark:text-zinc-50"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="h-9 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700"
          >
            Save
          </button>
          <button
            type="button"
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-950"
            onClick={() => setRenaming(false)}
          >
            Cancel
          </button>
        </form>
      ) : null}

      <div className="flex flex-col gap-2">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedWatchlistId) return;
            addSymbol(selectedWatchlistId, symbolDraft);
            setSymbolDraft("");
          }}
        >
          <input
            value={symbolDraft}
            onChange={(e) => setSymbolDraft(e.target.value)}
            placeholder="Add symbol directly (e.g., ABB)"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500/60 dark:border-zinc-800 dark:bg-black dark:text-zinc-50"
          />
          <button
            type="submit"
            className="h-9 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            disabled={!selectedWatchlistId}
          >
            Add
          </button>
        </form>
        <SymbolSearch
          disabled={!selectedWatchlistId}
          onSelect={(symbol) => {
            if (!selectedWatchlistId) return;
            addSymbol(selectedWatchlistId, symbol);
            selectSymbol(selectedWatchlistId, symbol);
            routerPush(`/s/${encodeURIComponent(symbol)}`);
          }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-auto">
        {selectedWatchlistId ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over) return;
              if (active.id === over.id) return;
              const oldIndex = items.findIndex((i) => i.id === active.id);
              const newIndex = items.findIndex((i) => i.id === over.id);
              if (oldIndex < 0 || newIndex < 0) return;
              const next = arrayMove(items, oldIndex, newIndex);
              reorderItems(
                selectedWatchlistId,
                next.map((i) => i.id),
              );
            }}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 px-3 py-8 text-xs text-zinc-500 dark:border-zinc-700">
                  Add your first symbol.
                </div>
              ) : (
                items.map((item, idx) => (
                  <SortableRow
                    key={item.id}
                    id={item.id}
                    indexLabel={idx + 1}
                    symbol={item.symbol}
                    active={activeSymbol === item.symbol}
                    onSelect={() => {
                      selectSymbol(selectedWatchlistId, item.symbol);
                      routerPush(`/s/${encodeURIComponent(item.symbol)}`);
                    }}
                    onRemove={() => removeItem(item.id)}
                  />
                ))
              )}
            </SortableContext>
          </DndContext>
        ) : null}
      </div>

      <footer className="text-[10px] text-zinc-500">
        Tip: click a symbol to open `/s/[symbol]`.
      </footer>
    </div>
  );
}

