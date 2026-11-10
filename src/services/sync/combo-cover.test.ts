/**
 * The combo-cover byte side channel, against a real SQLite (`SYNC-V2.md` §8.7.1).
 *
 * The two passes are pure functions of (row state, server state), exactly like
 * the image channel, so every case here is one combo in a known state and one
 * scripted answer. The SQL runs for real: the three predicates are the whole
 * protocol on this side, and a missing `IS NOT` would be invisible in a type
 * check.
 */
import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { DatabaseService } from "../db";
import { makeTestDatabase } from "../db/test-support";
import { countComboCoverBlobs, fetchComboCoverBlobs, uploadComboCoverBlobs } from "./combo-cover";
import {
  TransportError,
  type ComboCoverManifest,
  type Endpoint,
  type SyncTransport,
} from "./transport";

const ENDPOINT: Endpoint = { baseUrl: "https://sync.test", token: "kst_test", deviceId: "dev-1" };

/** A digest-shaped value; the real one is 64 hex characters from the server. */
function sha(tag: string): string {
  return `${tag}`.padEnd(64, "0").slice(0, 64);
}

type ComboSeed = {
  id?: string;
  /** The header's LWW clock. */
  clock?: number;
  /** `combo_sync_at`: false means the row itself is still owed to the server. */
  rowSynced?: boolean;
  /** The version the local cover file belongs to; `null` = no file this device vouches for. */
  blobVersion?: number | null;
  blobSha?: string | null;
  /** True means the server already accepted these bytes. */
  blobSynced?: boolean;
  deleted?: boolean;
  /** False means the combo has no cover at all. */
  cover?: boolean;
};

type Db = ReturnType<typeof makeTestDatabase>["db"];

function seedCombo(db: Db, seed: ComboSeed = {}): void {
  const id = seed.id ?? "combo_1";
  const clock = seed.clock ?? 1000;
  const cover = seed.cover !== false;
  db.query(
    `INSERT INTO combos (
        combo_id, combo_name, combo_active, combo_cover_name, combo_cover_mime,
        combo_updated_at, combo_sync_at, combo_deleted_at,
        combo_cover_blob_version, combo_cover_blob_sha256, combo_cover_blob_sync_at
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    id,
    cover ? `${id}.png` : null,
    cover ? "image/png" : null,
    clock,
    seed.rowSynced === false ? null : 7,
    seed.deleted === true ? clock : null,
    seed.blobVersion === undefined ? clock : seed.blobVersion,
    seed.blobSha === undefined ? null : seed.blobSha,
    seed.blobSynced === true ? 9 : null,
  );
}

function comboRow(db: Db, id = "combo_1") {
  return db
    .query(
      `SELECT combo_updated_at, combo_cover_blob_version, combo_cover_blob_sha256,
              combo_cover_blob_sync_at
        FROM combos WHERE combo_id = ?`,
    )
    .get(id) as {
    combo_updated_at: number;
    combo_cover_blob_version: number | null;
    combo_cover_blob_sha256: string | null;
    combo_cover_blob_sync_at: number | null;
  };
}

type Script = {
  manifest?: (input: { after: string | null }) => Promise<ComboCoverManifest>;
  put?: SyncTransport["comboCoverPut"];
  get?: SyncTransport["blobGet"];
};

function harness(script: Script = {}) {
  const { db, layer } = makeTestDatabase();
  const dbService = Context.get(Effect.runSync(Effect.scoped(Layer.build(layer))), DatabaseService);
  const calls = {
    manifest: [] as (string | null)[],
    put: [] as { comboId: string; version: number; fileName: string; mime: string }[],
    get: [] as { sha256: string; fileName: string }[],
  };

  const transport: SyncTransport = {
    health: () => Promise.resolve({ status: 200, message: "ok" }),
    pull: () => {
      throw new Error("pull is not part of the cover channel");
    },
    push: () => {
      throw new Error("push is not part of the cover channel");
    },
    productPull: () => {
      throw new Error("productPull is not part of the cover channel");
    },
    productPush: () => {
      throw new Error("productPush is not part of the cover channel");
    },
    merge: () => Promise.resolve({ statements: 0 }),
    blobManifest: () => Promise.resolve({ blobs: [], more: false, next: null }),
    blobPut: () => {
      throw new Error("blobPut is not part of the cover channel");
    },
    blobGet(_endpoint, input) {
      calls.get.push(input);
      return (
        script.get?.(_endpoint, input) ??
        Promise.resolve({ sha256: input.sha256, byteSize: 128, mime: "image/png" })
      );
    },
    comboCoverManifest(_endpoint, input) {
      calls.manifest.push(input.after);
      return (
        script.manifest?.(input) ?? Promise.resolve({ blobs: [], more: false, next: null })
      );
    },
    comboCoverPut(_endpoint, input) {
      calls.put.push(input);
      return (
        script.put?.(_endpoint, input) ??
        Promise.resolve({
          status: 201,
          comboId: input.comboId,
          version: input.version,
          sha256: sha(input.comboId),
          byteSize: 128,
          mime: input.mime,
          deduped: false,
          current: true,
        })
      );
    },
  };

  const deps = { db: dbService, transport, endpoint: ENDPOINT };
  return {
    db,
    calls,
    upload: () => Effect.runPromise(uploadComboCoverBlobs(deps)),
    fetch: () => Effect.runPromise(fetchComboCoverBlobs(deps)),
    count: () => Effect.runPromise(countComboCoverBlobs(dbService)),
  };
}

describe("uploadComboCoverBlobs", () => {
  test("uploads a cover whose version is the header's clock and records the digest", async () => {
    const h = harness();
    seedCombo(h.db);
    const report = await h.upload();

    expect(report.uploaded).toBe(1);
    expect(h.calls.put).toEqual([
      { comboId: "combo_1", version: 1000, fileName: "combo_1.png", mime: "image/png" },
    ]);
    const row = comboRow(h.db);
    expect(row.combo_cover_blob_version).toBe(1000);
    expect(row.combo_cover_blob_sha256).toBe(sha("combo_1"));
    expect(row.combo_cover_blob_sync_at).not.toBeNull();
  });

  test("a row the server has not accepted is not uploaded", async () => {
    const h = harness();
    seedCombo(h.db, { rowSynced: false });
    const report = await h.upload();
    expect(report.uploaded).toBe(0);
    expect(h.calls.put).toEqual([]);
  });

  test("a combo without a cover is never uploaded", async () => {
    const h = harness();
    seedCombo(h.db, { cover: false });
    const report = await h.upload();
    expect(report.uploaded).toBe(0);
    expect(h.calls.put).toEqual([]);
  });

  test("local_missing forgets the version so the next pass fetches it", async () => {
    const h = harness({
      put: () => Promise.reject(new TransportError(0, "local_missing", "no file")),
    });
    seedCombo(h.db);
    const report = await h.upload();

    expect(report.skipped).toBe(1);
    const row = comboRow(h.db);
    expect(row.combo_cover_blob_version).toBeNull();
    expect(row.combo_cover_blob_sha256).toBeNull();
    expect(row.combo_cover_blob_sync_at).toBeNull();
  });

  test("a cover-less server row is skipped without changing the local row", async () => {
    const h = harness({
      put: () => Promise.reject(new TransportError(409, "combo_cover_missing", "no cover")),
    });
    seedCombo(h.db);
    const report = await h.upload();

    expect(report.skipped).toBe(1);
    // Nothing written: the next pull settles which copy is current.
    expect(comboRow(h.db).combo_cover_blob_version).toBe(1000);
  });
});

describe("fetchComboCoverBlobs", () => {
  test("downloads the bytes for the header's current version and records them", async () => {
    const h = harness({
      manifest: () =>
        Promise.resolve({
          blobs: [
            { comboId: "combo_1", version: 1000, sha256: sha("server"), byteSize: 99, mime: "image/png" },
          ],
          more: false,
          next: null,
        }),
    });
    // The row moved to 1000; the local file belongs to 500.
    seedCombo(h.db, { clock: 1000, blobVersion: 500, blobSha: null });

    const report = await h.fetch();
    expect(report.fetched).toBe(1);
    expect(h.calls.get).toEqual([{ sha256: sha("server"), fileName: "combo_1.png" }]);

    const row = comboRow(h.db);
    expect(row.combo_cover_blob_version).toBe(1000);
    expect(row.combo_cover_blob_sha256).toBe(sha("server"));
    expect(row.combo_cover_blob_sync_at).not.toBeNull();
  });

  test("adopts bytes this device already holds without a download", async () => {
    const h = harness({
      manifest: () =>
        Promise.resolve({
          blobs: [
            { comboId: "combo_1", version: 1000, sha256: sha("same"), byteSize: 99, mime: "image/png" },
          ],
          more: false,
          next: null,
        }),
    });
    seedCombo(h.db, { clock: 1000, blobVersion: 500, blobSha: sha("same") });

    const report = await h.fetch();
    expect(report.adopted).toBe(1);
    expect(report.fetched).toBe(0);
    expect(h.calls.get).toEqual([]);
    expect(comboRow(h.db).combo_cover_blob_version).toBe(1000);
  });

  test("a manifest entry for another version is skipped", async () => {
    const h = harness({
      manifest: () =>
        Promise.resolve({
          blobs: [
            { comboId: "combo_1", version: 900, sha256: sha("old"), byteSize: 99, mime: "image/png" },
          ],
          more: false,
          next: null,
        }),
    });
    seedCombo(h.db, { clock: 1000, blobVersion: 500 });

    const report = await h.fetch();
    expect(report.fetched).toBe(0);
    expect(h.calls.get).toEqual([]);
  });

  test("a cover the server does not have yet is a placeholder, not a failure", async () => {
    const h = harness();
    seedCombo(h.db, { clock: 1000, blobVersion: 500 });
    const report = await h.fetch();
    expect(report.missing).toBe(1);
    expect(h.calls.get).toEqual([]);
  });
});

describe("countComboCoverBlobs", () => {
  test("sizes both directions from the row predicates", async () => {
    const h = harness();
    seedCombo(h.db, { id: "combo_up" });
    seedCombo(h.db, { id: "combo_fetch", blobVersion: 500 });
    seedCombo(h.db, { id: "combo_clean", blobSha: sha("x"), blobSynced: true });

    expect(await h.count()).toEqual({ up: 1, down: 1 });
  });
});
