/**
 * The image-byte side channel, against a real SQLite (`SYNC-V2.md` §2.10, §8.7.1).
 *
 * The two passes are pure functions of (row state, server state), so every case
 * here is one row in a known state and one scripted answer. The transport is a
 * fake — the real one is three Rust commands — but the SQL runs for real, which is
 * what makes the predicates ("needs upload", "needs fetch") worth testing: they
 * are the whole protocol on this side, and a missing `IS NOT` would be invisible
 * in a type check.
 */
import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { DatabaseService } from "../db";
import { makeTestDatabase } from "../db/test-support";
import { fetchImageBlobs, uploadImageBlobs } from "./blob";
import { mergePage } from "./merge";
import {
  TransportError,
  type BlobManifest,
  type Endpoint,
  type SyncTransport,
} from "./transport";

const ENDPOINT: Endpoint = { baseUrl: "https://sync.test", token: "kst_test", deviceId: "dev-1" };

/** A digest-shaped value; the real one is 64 hex characters from the server. */
function sha(tag: string): string {
  return `${tag}`.padEnd(64, "0").slice(0, 64);
}

type ImageSeed = {
  id?: string;
  /** The product the row belongs to; two are enough for the scoped passes. */
  productId?: string;
  mime?: string;
  /** The row's LWW clock. */
  clock?: number;
  /** `image_sync_at`: false means the row itself is still owed to the server. */
  rowSynced?: boolean;
  /** The version the local file belongs to; `null` = no file this device vouches for. */
  blobVersion?: number | null;
  blobSha?: string | null;
  /** True means the server already accepted these bytes. */
  blobSynced?: boolean;
  deleted?: boolean;
};

type Db = ReturnType<typeof makeTestDatabase>["db"];

function seedImage(db: Db, seed: ImageSeed = {}): void {
  const id = seed.id ?? "img_1";
  const productId = seed.productId ?? "prod_1";
  const clock = seed.clock ?? 1000;
  db.query(
    "INSERT OR IGNORE INTO products (product_id, product_name, product_note, product_updated_at, product_sync_at) VALUES (?, 'Kopi', '', ?, 1)",
  ).run(productId, clock);
  db.query(
    `INSERT INTO images (
        image_id, image_order, image_name, image_mime, product_id, image_updated_at,
        image_sync_at, image_deleted_at, image_blob_version, image_blob_sha256, image_blob_sync_at
      ) VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    `${id}.png`,
    seed.mime ?? "image/png",
    productId,
    clock,
    seed.rowSynced === false ? null : 7,
    seed.deleted === true ? clock : null,
    seed.blobVersion === undefined ? clock : seed.blobVersion,
    seed.blobSha === undefined ? null : seed.blobSha,
    seed.blobSynced === true ? 9 : null,
  );
}

function imageRow(db: Db, id = "img_1") {
  return db
    .query(
      `SELECT image_updated_at, image_blob_version, image_blob_sha256, image_blob_sync_at
        FROM images WHERE image_id = ?`,
    )
    .get(id) as {
    image_updated_at: number;
    image_blob_version: number | null;
    image_blob_sha256: string | null;
    image_blob_sync_at: number | null;
  };
}

type Script = {
  manifest?: (input: { after: string | null; productId?: string }) => Promise<BlobManifest>;
  put?: SyncTransport["blobPut"];
  get?: SyncTransport["blobGet"];
};

/** A database at the current schema, plus a transport that answers the byte routes. */
function harness(script: Script = {}, productId?: string) {
  const { db, layer } = makeTestDatabase();
  const dbService = Context.get(Effect.runSync(Effect.scoped(Layer.build(layer))), DatabaseService);
  const calls = {
    manifest: [] as (string | null)[],
    scoped: [] as (string | undefined)[],
    put: [] as string[],
    get: [] as string[],
  };

  const transport: SyncTransport = {
    health: () => Promise.resolve({ status: 200, message: "ok" }),
    pull: () => {
      throw new Error("pull is not part of the byte channel");
    },
    push: () => {
      throw new Error("push is not part of the byte channel");
    },
    productPull: () => {
      throw new Error("productPull is not part of the byte channel");
    },
    productPush: () => {
      throw new Error("productPush is not part of the byte channel");
    },
    merge: () => Promise.resolve({ statements: 0 }),
    blobManifest(_endpoint, input) {
      calls.manifest.push(input.after);
      calls.scoped.push(input.productId);
      return (
        script.manifest?.(input) ?? Promise.resolve({ blobs: [], more: false, next: null })
      );
    },
    blobPut(_endpoint, input) {
      calls.put.push(input.imageId);
      return (
        script.put?.(_endpoint, input) ??
        Promise.resolve({
          status: 201,
          imageId: input.imageId,
          version: input.version,
          sha256: sha(input.imageId),
          byteSize: 128,
          mime: input.mime,
          deduped: false,
          current: true,
        })
      );
    },
    blobGet(_endpoint, input) {
      calls.get.push(input.sha256);
      return (
        script.get?.(_endpoint, input) ??
        Promise.resolve({ sha256: input.sha256, byteSize: 128, mime: "image/png" })
      );
    },
  };

  const deps = {
    db: dbService,
    transport,
    endpoint: ENDPOINT,
    ...(productId === undefined ? {} : { productId }),
  };
  const withPasses = (passes?: number) =>
    passes === undefined ? deps : { ...deps, maxPasses: passes };
  return {
    db,
    calls,
    upload: (passes?: number) => Effect.runPromise(uploadImageBlobs(withPasses(passes))),
    fetch: (passes?: number) => Effect.runPromise(fetchImageBlobs(withPasses(passes))),
  };
}

describe("uploadImageBlobs", () => {
  test("uploads a file whose version is the row's clock, and records the server's digest", async () => {
    const h = harness();
    seedImage(h.db);
    const report = await h.upload();

    expect(report).toEqual({ uploaded: 1, skipped: 0, failed: 0, bytes: 128 });
    expect(h.calls.put).toEqual(["img_1"]);
    const row = imageRow(h.db);
    expect(row.image_blob_sha256).toBe(sha("img_1"));
    expect(row.image_blob_sync_at).not.toBeNull();
  });

  test("never uploads a row the server has not accepted yet (rows first, then bytes)", async () => {
    const h = harness();
    seedImage(h.db, { rowSynced: false });
    const report = await h.upload();

    expect(report.uploaded).toBe(0);
    expect(h.calls.put).toEqual([]);
  });

  test("never uploads bytes for a version this device did not produce", async () => {
    // The row's clock moved past the file (another till edited it, or this device
    // pulled a newer version): uploading would claim the wrong picture for it.
    const h = harness();
    seedImage(h.db, { blobVersion: 900 });
    const report = await h.upload();

    expect(report.uploaded).toBe(0);
    expect(h.calls.put).toEqual([]);
  });

  test("does not upload again once the server has the bytes", async () => {
    const h = harness();
    seedImage(h.db, { blobSha: sha("img_1"), blobSynced: true });
    const report = await h.upload();

    expect(report.uploaded).toBe(0);
    expect(h.calls.put).toEqual([]);
  });

  test("a missing local file forgets the version, so the row becomes a fetch", async () => {
    const h = harness({
      put: () => Promise.reject(new TransportError(0, "local_missing", "tidak ada")),
    });
    seedImage(h.db);
    const report = await h.upload();

    expect(report).toEqual({ uploaded: 0, skipped: 1, failed: 0, bytes: 0 });
    const row = imageRow(h.db);
    expect(row.image_blob_version).toBeNull();
    expect(row.image_blob_sha256).toBeNull();
  });

  test("a losing upload adopts the server's copy instead of retrying", async () => {
    const h = harness({
      put: () => Promise.reject(new TransportError(409, "blob_conflict", "sudah ada")),
    });
    seedImage(h.db);
    const report = await h.upload();

    expect(report).toEqual({ uploaded: 0, skipped: 1, failed: 0, bytes: 0 });
    expect(imageRow(h.db).image_blob_version).toBeNull();
  });

  test("a row the server does not have, or has deleted, is left for the pull", async () => {
    const unknown = harness({
      put: () => Promise.reject(new TransportError(404, "image_unknown", "baris belum ada")),
    });
    seedImage(unknown.db);
    expect((await unknown.upload()).skipped).toBe(1);
    expect(imageRow(unknown.db).image_blob_version).toBe(1000);

    const deleted = harness({
      put: () => Promise.reject(new TransportError(409, "image_deleted", "sudah dihapus")),
    });
    seedImage(deleted.db);
    expect((await deleted.upload()).skipped).toBe(1);
  });

  test("a transport failure is counted, never thrown: bytes cannot fail the group", async () => {
    const h = harness({ put: () => Promise.reject(new TransportError(0, "transport", "jaringan")) });
    seedImage(h.db);
    const report = await h.upload();

    expect(report).toEqual({ uploaded: 0, skipped: 0, failed: 1, bytes: 0 });
    expect(imageRow(h.db).image_blob_version).toBe(1000);
  });

  test("an ack for a row edited mid-flight does not mark the wrong version", async () => {
    const h = harness({
      put: (_endpoint, input) => {
        // The cashier reorders the gallery while the upload is in flight.
        h.db
          .query("UPDATE images SET image_updated_at = image_updated_at + 5 WHERE image_id = ?")
          .run(input.imageId);
        return Promise.resolve({
          status: 201,
          imageId: input.imageId,
          version: input.version,
          sha256: sha("late"),
          byteSize: 128,
          mime: input.mime,
          deduped: false,
          current: true,
        });
      },
    });
    seedImage(h.db);
    await h.upload();

    const row = imageRow(h.db);
    expect(row.image_updated_at).toBe(1005);
    // The digest belongs to the version that was uploaded, not to the new clock.
    expect(row.image_blob_sha256).toBeNull();
    expect(row.image_blob_sync_at).toBeNull();
  });

  test("a re-seed re-claims bytes the server may have lost", async () => {
    // What `Sinkronisasi Ulang` and a refused bookmark both do
    // (`forgetUploadedBlobsStatement`): the marker goes, the version and digest
    // stay, so the file is uploaded again for the clock it belongs to.
    const h = harness();
    seedImage(h.db, { blobSha: sha("img_1"), blobSynced: true });
    h.db.query("UPDATE images SET image_blob_sync_at = NULL").run();

    const report = await h.upload();
    expect(report.uploaded).toBe(1);
    expect(h.calls.put).toEqual(["img_1"]);
    expect(imageRow(h.db).image_blob_sync_at).not.toBeNull();
  });

  test("a deleted image is neither uploaded nor fetched", async () => {
    const h = harness();
    seedImage(h.db, { deleted: true });
    expect(await h.upload()).toEqual({ uploaded: 0, skipped: 0, failed: 0, bytes: 0 });
    expect(await h.fetch()).toEqual({ fetched: 0, adopted: 0, missing: 0, bytes: 0 });
    expect(h.calls.put).toEqual([]);
    expect(h.calls.manifest).toEqual([]);
  });
});

describe("fetchImageBlobs", () => {
  const oneBlob = (version: number, digest: string): Script => ({
    manifest: () =>
      Promise.resolve({
        blobs: [{ imageId: "img_1", version, sha256: digest, byteSize: 128, mime: "image/png" }],
        more: false,
        next: null,
      }),
  });

  test("downloads the bytes the manifest names for this exact version", async () => {
    const h = harness(oneBlob(1000, sha("server")));
    seedImage(h.db, { blobVersion: null });
    const report = await h.fetch();

    expect(report).toEqual({ fetched: 1, adopted: 0, missing: 0, bytes: 128 });
    expect(h.calls.get).toEqual([sha("server")]);
    const row = imageRow(h.db);
    expect(row.image_blob_version).toBe(1000);
    expect(row.image_blob_sha256).toBe(sha("server"));
    // Downloaded bytes are already on the server: never upload them back.
    expect(row.image_blob_sync_at).not.toBeNull();
  });

  test("a row that already holds the server's bytes moves its bookkeeping only", async () => {
    const shared = sha("same");
    const h = harness(oneBlob(1200, shared));
    // The clock moved (a reorder on another till); the picture did not.
    seedImage(h.db, { clock: 1200, blobVersion: 1000, blobSha: shared });
    const report = await h.fetch();

    expect(report).toEqual({ fetched: 0, adopted: 1, missing: 0, bytes: 0 });
    expect(h.calls.get).toEqual([]);
    expect(imageRow(h.db).image_blob_version).toBe(1200);
    expect(imageRow(h.db).image_blob_sync_at).not.toBeNull();
  });

  test("a manifest entry for a version this row has not merged is skipped", async () => {
    const h = harness(oneBlob(2000, sha("newer")));
    seedImage(h.db, { clock: 1000, blobVersion: null });
    const report = await h.fetch();

    expect(report).toEqual({ fetched: 0, adopted: 0, missing: 0, bytes: 0 });
    expect(h.calls.get).toEqual([]);
  });

  test("no bytes on the server is a placeholder, not a download", async () => {
    const h = harness();
    seedImage(h.db, { blobVersion: null });
    const report = await h.fetch();

    expect(report).toEqual({ fetched: 0, adopted: 0, missing: 1, bytes: 0 });
    expect(h.calls.get).toEqual([]);
  });

  test("a hash the server no longer serves leaves the row waiting", async () => {
    const h = harness({
      ...oneBlob(1000, sha("gone")),
      get: () => Promise.reject(new TransportError(404, "blob_missing", "tidak ada")),
    });
    seedImage(h.db, { blobVersion: null });
    const report = await h.fetch();

    expect(report).toEqual({ fetched: 0, adopted: 0, missing: 1, bytes: 0 });
    expect(imageRow(h.db).image_blob_version).toBeNull();
  });

  test("no candidate means no manifest call at all", async () => {
    const h = harness();
    seedImage(h.db, { blobSha: sha("current"), blobSynced: true });
    const report = await h.fetch();

    expect(report).toEqual({ fetched: 0, adopted: 0, missing: 0, bytes: 0 });
    expect(h.calls.manifest).toEqual([]);
  });

  test("a second manifest page is read when the first one says there is more", async () => {
    const h = harness({
      manifest: (input) =>
        Promise.resolve(
          input.after === null
            ? { blobs: [], more: true, next: "img_1" }
            : {
                blobs: [
                  {
                    imageId: "img_1",
                    version: 1000,
                    sha256: sha("second"),
                    byteSize: 128,
                    mime: "image/png",
                  },
                ],
                more: false,
                next: null,
              },
        ),
    });
    seedImage(h.db, { blobVersion: null });
    const report = await h.fetch();

    expect(report.fetched).toBe(1);
    expect(h.calls.manifest).toEqual([null, "img_1"]);
  });
});

describe("the row merge and the byte bookkeeping", () => {
  test("a pulled image row rewrites the seven wire columns and leaves the trio alone", async () => {
    // §8.7.1 / B10: the merge is generated from the wire dictionary, so the three
    // client-only columns are not in its column list. A regression there would
    // erase which picture this device holds every time the catalog syncs.
    const { db, layer } = makeTestDatabase();
    const dbService = Context.get(Effect.runSync(Effect.scoped(Layer.build(layer))), DatabaseService);
    seedImage(db, { clock: 1000, blobVersion: 1000, blobSha: sha("local"), blobSynced: true });

    await Effect.runPromise(
      mergePage(
        {
          db: dbService,
          execute: (statements) =>
            Effect.sync(() => {
              for (const statement of statements) {
                db.query(statement.sql).run(...(statement.bindings ?? []));
              }
            }),
        },
        "product",
        {
          changes: [
            {
              seq: 12,
              entity: "image",
              row: {
                image_id: "img_1",
                image_order: 0,
                image_name: "img_1.png",
                image_mime: "image/png",
                product_id: "prod_1",
                image_updated_at: 2000,
                image_deleted_at: null,
              },
            },
          ],
          aggregates: [],
          deletions: [],
        },
        [],
        { bookmark: 12 },
      ),
    );

    const row = imageRow(db);
    // The clock moved: the file is no longer the current version's bytes, so the
    // next pass fetches. What must NOT happen is the version being forgotten or
    // the bytes being re-uploaded.
    expect(row.image_updated_at).toBe(2000);
    expect(row.image_blob_version).toBe(1000);
    expect(row.image_blob_sha256).toBe(sha("local"));
    expect(row.image_blob_sync_at).not.toBeNull();
  });
});


describe("a product scope", () => {
  test("narrows upload and fetch to one product, and asks for that product's manifest", async () => {
    const h = harness({}, "prod_2");
    seedImage(h.db, { id: "img_p1", productId: "prod_1" });
    seedImage(h.db, { id: "img_p2", productId: "prod_2" });

    const up = await h.upload();
    expect(up.uploaded).toBe(1);
    expect(h.calls.put).toEqual(["img_p2"]);

    // Both local files are gone, so both rows would fetch. The manifest call is
    // scoped; only the row the server lists is downloaded.
    h.db.query("UPDATE images SET image_blob_version = NULL, image_blob_sha256 = NULL").run();
    const scoped = harness(
      {
        manifest: async (input) => {
          expect(input.productId).toBe("prod_2");
          return {
            blobs: [
              {
                imageId: "img_p2",
                version: 1000,
                sha256: sha("p2"),
                byteSize: 1,
                mime: "image/png",
              },
            ],
            more: false,
            next: null,
          };
        },
      },
      "prod_2",
    );
    seedImage(scoped.db, { id: "img_p1", productId: "prod_1", blobVersion: null });
    seedImage(scoped.db, { id: "img_p2", productId: "prod_2", blobVersion: null });
    const fetched = await scoped.fetch();
    expect(fetched.fetched + fetched.adopted).toBe(1);
    expect(scoped.calls.scoped).toEqual(["prod_2"]);
    expect(scoped.calls.get).toEqual([sha("p2")]);
  });
});

/**
 * A run has to leave a full copy.
 *
 * The passes are bounded so no single request batch stalls a page, but the *call*
 * is not: a sync that stops at twenty pictures is a sync the operator has to press
 * forty times, and the second machine never holds the whole gallery.
 */
describe("draining the backlog", () => {
  test("one upload call moves every file owed, not one pass of twenty", async () => {
    const h = harness();
    for (let index = 0; index < 45; index += 1) {
      seedImage(h.db, { id: `img_${index}`, clock: 1000 + index });
    }

    const report = await h.upload();

    expect(report.uploaded).toBe(45);
    expect(h.calls.put).toHaveLength(45);
    // Drained: the next call has nothing to select, and nothing is sent twice.
    expect(await h.upload()).toEqual({ uploaded: 0, skipped: 0, failed: 0, bytes: 0 });
  });

  test("one fetch call downloads every missing file", async () => {
    const h = harness({
      manifest: () =>
        Promise.resolve({
          blobs: Array.from({ length: 45 }, (_, index) => ({
            imageId: `img_${index}`,
            version: 1000 + index,
            sha256: sha(`server_${index}`),
            byteSize: 1,
            mime: "image/png",
          })),
          more: false,
          next: null,
        }),
    });
    for (let index = 0; index < 45; index += 1) {
      seedImage(h.db, { id: `img_${index}`, clock: 1000 + index, blobVersion: null });
    }

    const report = await h.fetch();

    expect(report.fetched).toBe(45);
    expect(h.calls.get).toHaveLength(45);
    expect(await h.fetch()).toEqual({ fetched: 0, adopted: 0, missing: 0, bytes: 0 });
  });

  test("a single pass is still available, for a page that must not wait on pictures", async () => {
    const h = harness();
    for (let index = 0; index < 45; index += 1) {
      seedImage(h.db, { id: `img_${index}`, clock: 1000 + index });
    }

    expect((await h.upload(1)).uploaded).toBe(20);
    // The rest is still owed, and still selectable: nothing was lost by stopping.
    expect((await h.upload()).uploaded).toBe(25);
  });

  test("a row the server refuses does not spin the drain", async () => {
    const h = harness({
      put: () => Promise.reject(new TransportError(404, "image_unknown", "baris belum ada")),
    });
    seedImage(h.db);
    // One pass, one skip: the row cannot change this cycle, so the loop stops
    // rather than selecting it a hundred times.
    expect(await h.upload()).toEqual({ uploaded: 0, skipped: 1, failed: 0, bytes: 0 });
  });
});
