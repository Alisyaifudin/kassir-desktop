import { describe, expect, test } from "bun:test";
import { flattenTransaction } from "./transaction";

describe("flattenTransaction", () => {
  test("shifts each statement's placeholders by the bindings before it", () => {
    const { query, bindings } = flattenTransaction([
      { sql: "UPDATE a SET x = $1 WHERE id = $2", bindings: [10, "a"] },
      { sql: "UPDATE b SET y = $1, z = $2 WHERE id = $3", bindings: [20, 30, "b"] },
      { sql: "DELETE FROM c" },
    ]);

    expect(query).toBe(
      "UPDATE a SET x = $1 WHERE id = $2;\nUPDATE b SET y = $3, z = $4 WHERE id = $5;\nDELETE FROM c",
    );
    expect(bindings).toEqual([10, "a", 20, 30, "b"]);
  });

  test("a reused placeholder keeps its index", () => {
    const { query, bindings } = flattenTransaction([
      { sql: "UPDATE d SET a = $1, b = $1 WHERE id = $2", bindings: [1, "d"] },
      { sql: "UPDATE e SET a = $1", bindings: [2] },
    ]);

    expect(query).toBe("UPDATE d SET a = $1, b = $1 WHERE id = $2;\nUPDATE e SET a = $3");
    expect(bindings).toEqual([1, "d", 2]);
  });
});
