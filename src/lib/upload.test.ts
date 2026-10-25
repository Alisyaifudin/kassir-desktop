import { describe, expect, test } from "bun:test";
import { describeUpload } from "./upload";

/**
 * All three bulk-import panels used to end with an unconditional
 * `toast.success("Berhasil mengunggah")`, including when every row was skipped
 * as a duplicate — while the panel underneath listed the skipped rows. These are
 * the four outcomes the loops can produce, pinned.
 */
describe("describeUpload", () => {
  test("a fully accepted file names the count written", () => {
    expect(describeUpload({ written: 42, skipped: 0, noun: "produk" })).toEqual({
      tone: "success",
      message: "42 produk diunggah.",
    });
  });

  test("a partially accepted file names both counts", () => {
    expect(describeUpload({ written: 12, skipped: 30, noun: "produk" })).toEqual({
      tone: "warning",
      message: "12 produk diunggah, 30 dilewati.",
    });
  });

  test("nothing written with rows skipped is an error, not a success", () => {
    expect(describeUpload({ written: 0, skipped: 200, noun: "catatan" })).toEqual({
      tone: "error",
      message: "Tidak ada catatan yang bisa diunggah, 200 dilewati.",
    });
  });

  test("an empty file is an error too", () => {
    expect(describeUpload({ written: 0, skipped: 0, noun: "catatan" })).toEqual({
      tone: "error",
      message: "Berkas tidak berisi data.",
    });
  });
});
