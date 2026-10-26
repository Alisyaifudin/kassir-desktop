import { describe, expect, spyOn, test } from "bun:test";
import { Effect } from "effect";
import { extractMoney, MAXIMUM_SIZE } from "./util-validate-money";

/**
 * The money-history JSON import. Everything here is a refusal the panel has to
 * render: the wrong file type, a file over 10 MB, text that is not JSON, and
 * JSON of the wrong shape. A row that slips through is a timestamped ledger entry
 * in SQLite, so the shape check is the last line of defence.
 */
function file(text: string, name = "uang.json", type = "application/json"): File {
  return new File([text], name, { type });
}

function oversized(name = "uang.json"): File {
  const file = new File(["[]"], name, { type: "application/json" });
  Object.defineProperty(file, "size", { value: MAXIMUM_SIZE + 1 });
  return file;
}

const run = (target: File) => Effect.runPromise(Effect.either(extractMoney(target)));

describe("extractMoney", () => {
  test("a valid file yields its rows and its name", async () => {
    const money = [
      { timestamp: 1, note: "modal", value: 100_000 },
      { timestamp: 2, note: "", value: -5_000 },
    ];

    const result = await run(file(JSON.stringify(money)));

    expect(result._tag).toBe("Right");
    if (result._tag === "Right") expect(result.right).toEqual({ money, name: "uang.json" });
  });

  test("a .json name is enough when the browser sends no mime type", async () => {
    const result = await run(
      file('[{"timestamp":1,"note":"","value":0}]', "uang", "application/json"),
    );
    expect(result._tag).toBe("Right");
  });

  test("a file that is not JSON is refused before it is read", async () => {
    const result = await run(file("timestamp,value", "uang.csv", "text/csv"));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left" && result.left._tag === "JsonError") {
      expect(result.left.e.message).toBe("Format file tidak sah. Harus JSON.");
    }
  });

  test("a file over 10 MB is refused by size", async () => {
    const result = await run(oversized());

    expect(result._tag).toBe("Left");
    if (result._tag === "Left" && result.left._tag === "TooBigError") {
      expect(result.left.size).toBe(MAXIMUM_SIZE + 1);
    }
  });

  test("text that does not parse is a JsonError", async () => {
    const result = await run(file("{not json"));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left._tag).toBe("JsonError");
  });

  test("JSON of the wrong shape is refused and logged", async () => {
    const logged = spyOn(console, "error").mockImplementation(() => {});
    const result = await run(file('[{"timestamp":"x","note":"","value":0}]'));
    logged.mockRestore();

    expect(result._tag).toBe("Left");
    if (result._tag === "Left" && result.left._tag === "JsonError") {
      expect(result.left.e.message).toBe("Format data tidak sah. Cek lagi.");
    }
  });

  test("an empty list is not a valid import", async () => {
    const logged = spyOn(console, "error").mockImplementation(() => {});
    const result = await run(file("[]"));
    logged.mockRestore();

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left._tag).toBe("JsonError");
  });
});
