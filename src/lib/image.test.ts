import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { Effect } from "effect";

/**
 * Product images on disk. Four rules the app depends on: every path is relative
 * to `AppData` (the fs scope is narrowed to it), the folder is created on first
 * save, the key readers and deleters pass is the `image_name` from the row — not
 * the row's id, or they look for a file that was never written — and a size read
 * names the same path the bytes do.
 *
 * The plugin is stubbed on this side of the boundary; the Rust fs scope itself is
 * what actually enforces the base dir.
 */
type Call = { fn: string; args: unknown[] };

const calls: Call[] = [];
const failing = new Set<string>();
let folderExists = true;
let bytes = new Uint8Array([1, 2, 3, 4]);

function record(fn: string, args: unknown[]) {
  calls.push({ fn, args });
  if (failing.has(fn)) throw new Error(`${fn} failed`);
}

mock.module("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppData: 1 },
  exists: async (...args: unknown[]) => {
    record("exists", args);
    return folderExists;
  },
  mkdir: async (...args: unknown[]) => record("mkdir", args),
  writeFile: async (...args: unknown[]) => record("writeFile", args),
  readFile: async (...args: unknown[]) => {
    record("readFile", args);
    return bytes;
  },
  remove: async (...args: unknown[]) => {
    record("remove", args);
  },
  stat: async (...args: unknown[]) => {
    record("stat", args);
    return { size: bytes.byteLength };
  },
}));

mock.module("@tauri-apps/api/path", () => ({
  join: async (...parts: string[]) => parts.join("/"),
}));

// The upload half runs in Rust (`image_adopt`): the webview writes the pick under
// its draft name, and this answers with the content-addressed name to commit.
let adopted: { name: string; mime: string } = { name: "abc-1.webp", mime: "image/webp" };

// Same stub shape as `auth.test.ts` / `printer.test.ts`: the whole module, not just
// the one function, because the plugin's event bridge imports the rest of it.
mock.module("@tauri-apps/api/core", () => ({
  transformCallback: () => 1,
  Channel: class {},
  convertFileSrc: (path: string) => path,
  isTauri: () => false,
  invoke: async (command: string, args: unknown) => {
    record(`invoke:${command}`, [args]);
    if (failing.has(command)) throw new Error(`${command} failed`);
    return adopted;
  },
}));

const created: Blob[] = [];
const originalCreate = URL.createObjectURL;
URL.createObjectURL = (blob: Blob) => {
  created.push(blob);
  return "blob:image";
};

const { image } = await import("./image");

const callTo = (fn: string) => calls.filter((call) => call.fn === fn);

/** `IOError` wraps the driver's sentence; a failed command carries its own. */
const messageOf = (error: { e: Error } | { message: string }) =>
  "e" in error ? error.e.message : error.message;

beforeEach(() => {
  calls.length = 0;
  failing.clear();
  folderExists = true;
  bytes = new Uint8Array([1, 2, 3, 4]);
  created.length = 0;
  adopted = { name: "abc-1.webp", mime: "image/webp" };
});

describe("image.save", () => {
  test("creates the images folder on first use and writes under AppData", async () => {
    folderExists = false;
    const file = new File([new Uint8Array([9, 8, 7])], "photo.png");

    const stored = await Effect.runPromise(image.save(file, "img-1.png", "image/png"));

    expect(callTo("exists")[0].args).toEqual(["images", { baseDir: 1 }]);
    expect(callTo("mkdir")[0].args).toEqual(["images", { baseDir: 1, recursive: true }]);
    expect(callTo("writeFile")[0].args).toEqual([
      "images/img-1.png",
      new Uint8Array([9, 8, 7]),
      { baseDir: 1 },
    ]);
    // The draft name is what was written; the stored name is what the row carries.
    expect(callTo("invoke:image_adopt")[0].args).toEqual([
      { name: "img-1.png", mime: "image/png" },
    ]);
    expect(stored).toEqual({ name: "abc-1.webp", mime: "image/webp" });
  });

  test("skips the mkdir when the folder is already there", async () => {
    await Effect.runPromise(
      image.save(new File([new Uint8Array([1])], "a.png"), "a.png", "image/png"),
    );
    expect(callTo("mkdir")).toHaveLength(0);
  });

  test("a failed conversion is reported, not silently saved under the draft name", async () => {
    failing.add("image_adopt");

    const result = await Effect.runPromise(
      Effect.either(image.save(new File([new Uint8Array([1])], "a.png"), "a.png", "image/png")),
    );

    expect(result._tag).toBe("Left");
    expect(result._tag === "Left" && messageOf(result.left)).toBeTruthy();
  });

  test("a folder that cannot be read is an IOError naming the step", async () => {
    failing.add("exists");

    const result = await Effect.runPromise(
      Effect.either(
        image.save(new File([new Uint8Array([1])], "a.png"), "a.png", "image/png"),
      ),
    );

    expect(result._tag === "Left" && messageOf(result.left)).toBe("Gagal membaca folder images");
  });
});

describe("image.load", () => {
  test("reads images/<key> from AppData and returns an object URL", async () => {
    const url = await Effect.runPromise(image.load("img-1.png", "image/png"));

    expect(url).toBe("blob:image");
    expect(callTo("readFile")[0].args).toEqual(["images/img-1.png", { baseDir: 1 }]);
    expect(created[0]).toBeInstanceOf(Blob);
    expect(created[0].type).toBe("image/png");
  });

  test("a read failure is an IOError rather than a broken <img>", async () => {
    failing.add("readFile");

    const result = await Effect.runPromise(Effect.either(image.load("img.png", "image/png")));

    expect(result._tag === "Left" && result.left.e.message).toBe("Gagal membaca gambar");
  });
});

describe("image.size", () => {
  test("asks for the size of the same path the bytes live at", async () => {
    const size = await Effect.runPromise(image.size("img-1.png"));

    expect(size).toBe(4);
    expect(callTo("stat")[0].args).toEqual(["images/img-1.png", { baseDir: 1 }]);
  });

  test("a file that is not there fails, so the caller can treat it as unknown", async () => {
    // Not an error the sync can do anything about: a pulled row may name bytes
    // that only ever lived on the device that produced them.
    failing.add("stat");

    const result = await Effect.runPromise(Effect.either(image.size("gone.png")));

    expect(result._tag === "Left" && result.left.e.message).toBe(
      "Gagal membaca ukuran gambar",
    );
  });
});

describe("image.del", () => {
  test("removes the same path load reads", async () => {
    await Effect.runPromise(image.del("img-1.png"));

    expect(callTo("remove")[0].args).toEqual(["images/img-1.png", { baseDir: 1 }]);
  });

  test("a remove failure is an IOError", async () => {
    failing.add("remove");

    const result = await Effect.runPromise(Effect.either(image.del("img.png")));

    expect(result._tag === "Left" && result.left.e.message).toBe("Gagal membaca gambar");
  });
});

// Keep the process-wide URL intact for the files after this one.
afterAll(() => {
  URL.createObjectURL = originalCreate;
});
