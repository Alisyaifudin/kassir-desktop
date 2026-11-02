import { describe, expect, test } from "bun:test";
import { IOError } from "~/lib/effect-error";
import { formatSize, messageOf } from "./util-file";

/**
 * The one sentence a download/upload panel shows for a failure. File errors wrap
 * their reason inside `IOError.e` (the wrapper's `message` is generic), service
 * errors carry theirs directly — reading the wrong one leaves the panel saying
 * "Gagal" with nothing to act on.
 */
describe("messageOf", () => {
  test("a service error's own message is the sentence", () => {
    expect(messageOf({ message: "Koneksi putus" })).toBe("Koneksi putus");
  });

  test("an IOError shows the sentence it was built with", () => {
    const error = new IOError(new Error("EACCES"), "Gagal menyimpan file");
    expect(messageOf(error)).toBe("Gagal menyimpan file");
  });
});

/**
 * The size in the backup toast. The point of the number is that the cashier can
 * see the archive is not empty, so the unit has to change with the file and the
 * decimals have to read Indonesian (`3,2 MB`, not `3.2 MB`).
 */
describe("formatSize", () => {
  test("bytes stay bytes, so a suspiciously tiny backup is visible", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(1023)).toBe("1023 B");
  });

  test("kilobytes lose the fraction", () => {
    expect(formatSize(2048)).toBe("2 KB");
  });

  test("the last byte before a megabyte still reads as a megabyte", () => {
    expect(formatSize(1024 * 1024 - 1)).toBe("1 MB");
  });

  test("megabytes keep one decimal, with a comma", () => {
    expect(formatSize(3.2 * 1024 * 1024)).toBe("3,2 MB");
  });

  test("a whole megabyte does not read as `1,0 MB`", () => {
    expect(formatSize(1024 * 1024)).toBe("1 MB");
  });
});
