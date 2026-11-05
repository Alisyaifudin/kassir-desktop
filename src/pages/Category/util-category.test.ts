import { describe, expect, test } from "bun:test";
import { CategoryDuplicateName, CategoryError } from "~/services/category";
import { categoryMessage } from "./util-category";

describe("categoryMessage", () => {
  test("no error, no sentence", () => {
    expect(categoryMessage(null)).toBeNull();
  });

  test("a taken name names the name", () => {
    expect(categoryMessage(new CategoryDuplicateName({ value: "Minuman" }))).toBe(
      'Kategori "Minuman" sudah ada.',
    );
  });

  test("anything else is the service's own sentence", () => {
    expect(categoryMessage(new CategoryError({ message: "Data gagal disimpan." }))).toBe(
      "Data gagal disimpan.",
    );
  });
});
