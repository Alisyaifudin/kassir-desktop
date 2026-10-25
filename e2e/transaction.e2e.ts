import { expect, test, type Page } from "@playwright/test";
import { boot, cashierSql, login } from "./harness";

/**
 * `/transaction`: a hand-typed record. No catalog, no search — lines of
 * name + amount, one mode, one method, and a mocked save action.
 *
 * The line grid is keyboard-driven like Pos/Restock: one tab stop, arrows move
 * the selection, Enter edits. These tests drive it the way the operator does.
 */
const seed = [cashierSql("Raisya", "123456")];

async function open(page: Page) {
  const errors = await boot(page, { sql: seed });
  await login(page, "Raisya", "123456");
  await expect(page.getByRole("heading", { name: "Beranda", level: 1 })).toBeVisible();
  const menu = page.locator("section", { has: page.getByRole("heading", { name: "Menu" }) });
  await menu.getByRole("link", { name: /^Transaksi/ }).click();
  await expect(page.getByRole("heading", { name: "Transaksi", level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/#\/transaction/);
  return errors;
}

/** Select a cell, open its editor, type, and commit with Enter. */
async function edit(page: Page, field: "Nama" | "Nilai", row: number, text: string) {
  await page.getByRole("gridcell", { name: `${field} baris ${row}` }).click();
  const input = page.getByRole("textbox", { name: `${field} baris ${row}` });
  await input.fill(text);
  await input.press("Enter");
}

test("starts with one empty line and a disabled Simpan", async ({ page }) => {
  const errors = await open(page);

  await expect(page.getByRole("gridcell", { name: "Nama baris 1" })).toContainText(
    "Nama transaksi",
  );
  await expect(page.getByRole("gridcell", { name: "Nilai baris 1" })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "Hapus baris 1" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Masuk" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Simpan" })).toBeDisabled();
  await expect(page.getByText("Raisya")).toBeVisible();

  expect(errors).toEqual([]);
});

test("adds lines, totals them, and removes one", async ({ page }) => {
  await open(page);

  await page.getByRole("button", { name: "Baris Baru" }).click();
  await expect(page.getByRole("gridcell", { name: "Nama baris 2" })).toBeVisible();

  await edit(page, "Nama", 1, "Ongkos kirim");
  await edit(page, "Nilai", 1, "25000");
  await edit(page, "Nama", 2, "Diskon langganan");
  await edit(page, "Nilai", 2, "5000");

  await expect(page.getByTestId("transaction-total")).toHaveText("Rp30.000");
  await expect(page.getByRole("button", { name: "Simpan" })).toBeEnabled();

  await page.getByRole("gridcell", { name: "Hapus baris 2" }).click();
  await expect(page.getByRole("gridcell", { name: "Nama baris 2" })).toHaveCount(0);
  await expect(page.getByTestId("transaction-total")).toHaveText("Rp25.000");
});

test("the last line cannot be deleted, only cleared", async ({ page }) => {
  await open(page);

  await edit(page, "Nama", 1, "Sewa");
  await edit(page, "Nilai", 1, "1000");
  await page.getByRole("gridcell", { name: "Hapus baris 1" }).click();

  await expect(page.getByRole("gridcell", { name: "Nama baris 1" })).toContainText(
    "Nama transaksi",
  );
  await expect(page.getByTestId("transaction-total")).toHaveText("Rp0");
  await expect(page.getByRole("button", { name: "Simpan" })).toBeDisabled();
});

test("switches mode, then writes the record", async ({ page }) => {
  await open(page);

  await edit(page, "Nama", 1, "Beli plastik");
  await edit(page, "Nilai", 1, "15000");
  await page.getByRole("radio", { name: "Keluar" }).click();
  await expect(page.getByRole("radio", { name: "Keluar" })).toBeChecked();

  // `Simpan` writes a real record now (`record.add.adjustment`) and closes the
  // tab; it used to be a stub that only raised a toast, which is what this test
  // asserted. The confirmation dialog carrying a record id *is* the success.
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("heading", { name: "Transaksi tersimpan" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lihat detail" })).toBeVisible();
});

test("navigates the grid with the arrow keys", async ({ page }) => {
  await open(page);

  // The grid is the screen's working surface: it holds the keyboard on arrival,
  // and Enter opens the editor of the cell under the selection.
  await expect(page.getByRole("grid", { name: "Baris transaksi" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Nama baris 1" })).toBeFocused();
  await page.keyboard.type("Ongkos kirim");
  await page.keyboard.press("Enter");

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Nilai baris 1" })).toBeFocused();
  await page.keyboard.type("25000");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("transaction-total")).toHaveText("Rp25.000");

  // A new line opens straight into its name cell.
  await page.getByRole("button", { name: "Baris Baru" }).click();
  await expect(page.getByRole("textbox", { name: "Nama baris 2" })).toBeFocused();
  await page.keyboard.type("Diskon");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Nilai baris 2" })).toBeFocused();
  await page.keyboard.type("5000");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("transaction-total")).toHaveText("Rp30.000");

  // Up keeps the column: from line 2's amount to line 1's amount.
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Nilai baris 1" })).toBeFocused();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("21000");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("transaction-total")).toHaveText("Rp26.000");

  // The x cell deletes the line under the selection.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("gridcell", { name: "Nama baris 2" })).toHaveCount(0);
  await expect(page.getByTestId("transaction-total")).toHaveText("Rp21.000");
});

test("writes the note in a dialog", async ({ page }) => {
  await open(page);

  await page.getByRole("button", { name: "Catatan" }).click();
  await page.locator("textarea").fill("Titip nota ke Bu Sari");
  await page.getByRole("button", { name: "Selesai" }).click();

  await expect(page.getByRole("button", { name: /Catatan \(terisi\)/ })).toBeVisible();
});
