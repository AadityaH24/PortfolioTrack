import { describe, expect, it } from "vitest";
import { __test__, createEmptyRoot } from "./persist";

describe("persist migrations", () => {
  it("creates default root when raw is null", () => {
    const root = __test__.migrateToLatest(null);
    expect(root.schemaVersion).toBe(1);
    expect(root.watchlists.length).toBeGreaterThan(0);
    expect(root.settings.selectedWatchlistId).toBeTruthy();
  });

  it("resets to empty root on invalid schema", () => {
    const root = __test__.migrateToLatest({ bad: "data" });
    const empty = createEmptyRoot();
    expect(root.schemaVersion).toBe(empty.schemaVersion);
    expect(root.watchlists[0]?.name).toBe(empty.watchlists[0]?.name);
  });
});

