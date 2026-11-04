import { describe, expect, test } from "bun:test";
import type { SyncLogEntry } from "~/services/sync";
import { clockOf, rowsOf, textOf } from "./z-Log";

/**
 * The sentences the log writes.
 *
 * The rules under test are the ones that would make the box lie: a line says only
 * what its entry carried (a tombstone has no name to print), a verdict on a pushed
 * row is attached to *that* row, and a page of merge counts reads as one sentence
 * rather than four.
 */

function entry(overrides: Partial<SyncLogEntry> = {}): SyncLogEntry {
  return { kind: "pull", at: 0, group: "product", entity: "product", label: null, ...overrides } as SyncLogEntry;
}

describe("textOf", () => {
  test("names the entity in Indonesian and appends the row's own name", () => {
    expect(textOf(entry({ label: "Masker Kain" })).text).toBe("Mengunduh produk Masker Kain");
    expect(textOf(entry({ entity: "product_name", label: "masker" })).text).toBe(
      "Mengunduh nama lain produk masker",
    );
    expect(textOf(entry({ entity: "listing", label: "Masker 50 pcs" })).text).toBe(
      "Mengunduh listing Masker 50 pcs",
    );
  });

  test("prints only the noun when the row has no name", () => {
    expect(textOf(entry()).text).toBe("Mengunduh produk");
  });

  test("a stock event carries its own direction in the label", () => {
    expect(textOf(entry({ entity: "product_event", label: "keluar 1" })).text).toBe(
      "Mengunduh stok keluar 1",
    );
  });

  test("a tombstone is named by its noun: the frame carries an id alone", () => {
    const line = textOf({ kind: "delete", at: 0, group: "product", entity: "product" });
    expect(line.text).toBe("Menghapus produk");
    expect(line.mark).toBe("down");
  });

  test("reports the server's verdict on a pushed row", () => {
    const base = { at: 0, group: "product", entity: "product", label: "Masker Kain" } as const;
    expect(textOf({ kind: "push", ...base, ack: "applied" }).text).toBe(
      "Mengunggah produk Masker Kain",
    );
    expect(textOf({ kind: "push", ...base, ack: "noop" }).text).toBe(
      "Sudah ada produk Masker Kain",
    );
    // The colon keeps the verdict from reading as part of the name.
    expect(textOf({ kind: "push", ...base, ack: "stale" }).text).toBe(
      "Server menang: produk Masker Kain",
    );
    expect(textOf({ kind: "push", ...base, ack: "stale" }).mark).toBe("up");
  });

  test("counts an image, with its name when the row has one", () => {
    const line = textOf({
      kind: "image",
      at: 0,
      group: "product",
      direction: "down",
      name: "masker-1.jpg",
      done: 3,
      total: 12,
    });
    expect(line.text).toBe("Mengunduh gambar masker-1.jpg (3/12)");
    expect(line.mark).toBe("down");
    expect(
      textOf({
        kind: "image",
        at: 0,
        group: "product",
        direction: "up",
        name: null,
        done: 1,
        total: 2,
      }).text,
    ).toBe("Mengunggah gambar (1/2)");
  });

  test("turns one page of merge counts into one sentence", () => {
    const merge = { kind: "merge", at: 0, group: "product" } as const;
    expect(textOf({ ...merge, applied: 40, noop: 0, stale: 0, parked: 0 }).text).toBe(
      "Menyimpan 40 perubahan",
    );
    expect(textOf({ ...merge, applied: 0, noop: 12, stale: 0, parked: 0 }).text).toBe(
      "Melewati 12 data yang sudah ada",
    );
    expect(textOf({ ...merge, applied: 3, noop: 0, stale: 2, parked: 1 }).text).toBe(
      "Menyimpan 3 perubahan · Mengikuti server untuk 2 data · Menahan 1 catatan kas (kantong belum ada)",
    );
    expect(textOf({ ...merge, applied: 0, noop: 0, stale: 0, parked: 0 }).text).toBe("");
  });

  test("a note carries its own sentence, and its level decides the mark", () => {
    expect(
      textOf({ kind: "note", at: 0, group: null, text: "Tidak ada perubahan lain", level: "info" }),
    ).toEqual({ at: 0, mark: "note", text: "Tidak ada perubahan lain" });
    expect(
      textOf({ kind: "note", at: 0, group: "money", text: "Server tidak menjawab", level: "error" })
        .mark,
    ).toBe("error");
  });
});

describe("rowsOf", () => {
  test("heads each group's block once, not once per line", () => {
    const rows = rowsOf(
      [
        entry({ group: "money", entity: "pocket", label: "Kas" }),
        entry({ group: "money", entity: "money", label: "Rp 5.000" }),
        entry({ group: "product", entity: "product", label: "Masker" }),
      ],
      0,
    );
    expect(rows.map((row) => row.kind)).toEqual(["group", "line", "line", "group", "line"]);
    expect(rows[0]).toMatchObject({ label: "Kas & Uang" });
    expect(rows[3]).toMatchObject({ label: "Produk & Stok" });
  });

  test("a run-level note does not start a group block", () => {
    const rows = rowsOf([{ kind: "note", at: 0, group: null, text: "Menyiapkan", level: "info" }], 0);
    expect(rows.map((row) => row.kind)).toEqual(["line"]);
  });

  test("says how many lines the ring dropped, as the first row", () => {
    const rows = rowsOf([entry()], 1_234);
    expect(rows[0]).toEqual({ key: "dropped", kind: "dropped", count: 1_234 });
    expect(rows[1]?.kind).toBe("group");
  });

  test("an empty log has no rows at all", () => {
    expect(rowsOf([], 0)).toEqual([]);
  });
});

describe("clockOf", () => {
  test("prints a wall clock, zero-padded", () => {
    const at = new Date(2024, 2, 9, 7, 4, 3).getTime();
    expect(clockOf(at)).toBe("07:04:03");
  });
});
