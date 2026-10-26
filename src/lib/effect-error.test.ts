import { describe, expect, test } from "bun:test";
import {
  ArrayBufferError,
  DuplicateError,
  InvalidCredential,
  InvokeError,
  IOError,
  JsonError,
  NotFound,
  TooBigError,
} from "./effect-error";

/**
 * These are the values `catchTag` and the page fallbacks switch on, so the `_tag`
 * strings are part of the contract: a rename here silently stops a reader from
 * handling the failure and turns a "not found" into a crash screen. The `IOError`
 * family also carries a cashier-facing sentence, never the driver text.
 */
describe("tagged errors", () => {
  test("each carries the tag its handlers match on", () => {
    expect(new NotFound({ message: "Kosong" })._tag).toBe("NotFound");
    expect(new InvokeError({ message: "Aplikasi bermasalah" })._tag).toBe("InvokeError");
    expect(new InvalidCredential({ message: "Kata sandi salah" })._tag).toBe(
      "InvalidCredential",
    );
  });

  test("the message is what the page shows", () => {
    const error = new NotFound({ message: "Produk tidak ditemukan" });
    expect(error.message).toBe("Produk tidak ditemukan");
  });
});

describe("IOError", () => {
  test("a plain message is the sentence shown, the cause is kept for the log", () => {
    const cause = new Error("EACCES");
    const error = new IOError(cause, "Gagal menyimpan file");

    expect(error._tag).toBe("IOError");
    expect(error.e.message).toBe("Gagal menyimpan file");
    expect(error.e.cause).toBe(cause);
  });

  test("a thrown string becomes the message", () => {
    expect(new IOError("disk penuh").e.message).toBe("disk penuh");
  });

  test("a non-Error without a message still yields something printable", () => {
    const cause = { code: 5 };
    const error = new IOError(cause);

    expect(error.e.message).toBe("Io error");
    expect(error.e.cause).toBe(cause);
  });
});

describe("JsonError and ArrayBufferError", () => {
  test("a string is the message, anything else is wrapped with a cause", () => {
    expect(new JsonError("Gagal parse").e.message).toBe("Gagal parse");
    expect(new JsonError({ at: 3 }).e.message).toBe("Json conversion error");
    expect(new JsonError({ at: 3 }).e.cause).toEqual({ at: 3 });

    expect(new ArrayBufferError("bukan buffer").e.message).toBe("bukan buffer");
    expect(new ArrayBufferError(null).e.message).toBe("Array buffer conversion error");
  });
});

describe("value-carrying errors", () => {
  test("keep the value the dialog uses in its message", () => {
    expect(new TooBigError(12_000_000).size).toBe(12_000_000);
    expect(new DuplicateError("Kopi").name).toBe("Kopi");
  });
});
