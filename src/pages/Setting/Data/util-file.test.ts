import { describe, expect, test } from "bun:test";
import { IOError } from "~/lib/effect-error";
import { messageOf } from "./util-file";

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
