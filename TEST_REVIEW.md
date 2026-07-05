# Test Review — pages/* 

Date: 2026-07-05

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Test is correct, reaches a real user path |
| ⚠️ | Test has an issue (wrong assertion, doesn't test what it claims, missing coverage) |
| 🚨 | Test is **broken** — passes for the wrong reason or tests unreachable branch |

---

## 1. Cashier

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves successfully when all required services are provided" | ✅ |
| "renders heading and description" | ✅ |
| "shows loading skeleton while loader is pending" | ✅ |
| "shows error message when loader fails" | ✅ |
| "renders cashier list items" | ✅ |
| "renders 'Tambah Kasir' button" | ✅ |
| "deleting a cashier removes it from the list" | ✅ |
| "adding a new cashier makes it appear in the list" | ✅ |
| "changing a cashier's role updates the select display" | ✅ |
| "updating a cashier's name re-renders with new value" | ✅ |
| "shows error when add fails" | ✅ |

**Verdict:** All page-level tests are correct. Good coverage of the loading → success → error states plus mutation round-trips.

---

### `z-CashierList.test.tsx`

| Test | Verdict |
|------|---------|
| "renders all cashier items" | ✅ |
| "renders empty list when no cashiers" | ✅ |
| "self item renders as text, not input" | ✅ |
| "self item has disabled role select" | ✅ |
| "self item has no delete button" | ✅ |
| "shows error when name update fails" | ✅ |
| "shows error when role update fails" | ✅ |
| "shows validation error when name is empty on submit" | ✅ |
| "delete dialog shows cashier name and confirmation" | ✅ |
| "clicking Batal in delete dialog closes it" | ✅ |
| "pressing Escape in delete dialog closes it" | ✅ |
| "deleting a cashier removes it from the list" | ✅ |
| "updating name invokes onUpdateName and shows no error" | ✅ |
| "changing role updates the select value" | ✅ |

**Verdict:** All correct. The delete round-trip is duplicated with the page test but that's fine — different test level (unit vs integration). The `useUser()` on self-item branch is well covered: text-only display, disabled combobox, no delete button.

---

### `z-NewCashier.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Tambah Kasir' trigger button" | ✅ |
| "opens dialog when trigger is clicked" | ✅ |
| "dialog contains a name form field" | ✅ |
| "shows error when onAdd returns error message" | ✅ |
| "clears error on successful subsequent submit" | ✅ |
| "dialog stays open when name is empty (validation blocks submit)" | ✅ |
| "closing dialog with 'Batal' button" | ✅ |
| "pressing Escape closes the dialog" | ✅ |

**Verdict:** All correct. 

🔴 **Missing:** "dialog closes on successful add." Compare with `z-NewCustomer.test.tsx` which covers this (`"dialog closes on successful add"`). The component probably closes the dialog when `onAdd` returns `null` — the page test covers this indirectly but the unit test does not.

---

## 2. Customer

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves successfully when CustomerService is provided" | ✅ |
| "renders heading and description" | ✅ |
| "shows loading skeleton while loader is pending" | ✅ |
| "shows error message when loader fails" | ✅ |
| "renders customer list items with names and phones" | ✅ |
| "renders 'Tambah Pelanggan' button" | ✅ |
| "deleting a customer removes it from the list" | ✅ |
| "adding a new customer makes it appear in the list" | ✅ |
| "updating a customer's name re-renders with new value" | ✅ |
| "shows error when add fails" | ✅ |

**Verdict:** All correct. The `adding a new customer` test correctly scopes queries to the dialog with `within(dialog)` to avoid matching list-item inputs — good practice.

---

### `z-CustomerList.test.tsx`

| Test | Verdict |
|------|---------|
| "renders all customer items with name and phone" | ✅ |
| "renders empty list when no customers" | ✅ |
| "shows error when name update fails" | ✅ |
| "updating name invokes onUpdate and shows no error" | ✅ |
| "delete dialog shows customer name and phone" | ✅ |
| "delete dialog closes on success" | ✅ |
| "clicking Batal in delete dialog closes it" | ✅ |
| "pressing Escape in delete dialog closes it" | ✅ |
| "deleting a customer removes it from the list" | ✅ |

**Verdict:** All correct. Good coverage: deletion (success + cancel + escape), name update (success + failure), empty state.

---

### `z-NewCustomer.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Tambah Pelanggan' trigger button" | ✅ |
| "opens dialog when trigger is clicked" | ✅ |
| "dialog contains name and phone fields" | ✅ |
| "shows error when onAdd returns error message" | ✅ |
| "clears error on successful subsequent submit" | ✅ |
| "dialog stays open when name is empty (validation blocks submit)" | ✅ |
| "closing dialog with 'Batal' button" | ✅ |
| "dialog closes on successful add" | ✅ |
| "pressing Escape closes the dialog" | ✅ |

**Verdict:** All correct. Note: this has `"dialog closes on successful add"` which is missing in `z-NewCashier`.

---

## 3. Home

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when all services are provided" | ✅ |
| "renders greeting with user name" | ✅ |
| "renders today's date" | ✅ |
| "renders 'Navigasi Utama' heading" | ✅ |
| "renders statistics cards" | ✅ |
| "renders nav cards" | ✅ |
| "renders admin-only nav cards" | ✅ |
| "admin nav cards have descriptions" | ✅ |
| "does not render admin-only nav cards" | ✅ |
| "shows error when income data fails" | ✅ |
| "shows error when expense data fails" | ✅ |
| "shows error when transaction count fails" | ✅ |

**Verdict:** All correct. Good coverage of admin vs user role branches plus all three error states.

---

### `z-BaseFinancialCard.test.tsx`

| Test | Verdict |
|------|---------|
| "renders value on success" | ✅ |
| "renders diffPercent description on success" | ✅ |
| "renders negative diffPercent" | ✅ |
| "renders empty description when diffPercent is undefined" | ✅ |
| "shows loading skeleton initially" | ✅ |
| "shows error message when loader fails" | ✅ |

**Verdict:** All correct. Covers the `diffPercent === undefined` branch that produces empty description (user-reachable: a first-time user with no yesterday data).

---

### `z-Header.test.tsx`

| Test | Verdict |
|------|---------|
| "renders greeting with capitalized user name" | ✅ |
| "renders greeting with different user" | ✅ |
| "renders today prop" | ✅ |
| "renders custom today prop" | ✅ |

**Verdict:** All correct, simple static renders.

---

### `z-NavGrid.test.tsx`

| Test | Verdict |
|------|---------|
| "renders public nav cards for all roles" | ✅ |
| "renders admin-only nav cards" | ✅ |
| "hides admin-only nav cards" | 🚨 |
| "nav cards have descriptions" | ✅ |

🚨 **BUG — Double negation:** `"hides admin-only nav cards"` uses:
```ts
expect(screen.queryByText("Analisis")).not.not.toBeNull();
```
`.not.not` cancels out to `.toBeNull()`, so the assertion is `queryByText("Analisis")` **is null** — which is correct, but only by accident after the double-negation cancels. The other five assertions on the same block (`Uang`, `Kontak`, `Kasir`, `Metode`, `Pelanggan`) have the same typo.

**Fix:** Change all six `.not.not.toBeNull()` to `.toBeNull()`.

---

### `z-StatisticsGrid.test.tsx`

| Test | Verdict |
|------|---------|
| "renders income card with label, value and description" | ✅ |
| "renders expense card with label, value and description" | ✅ |
| "renders total transactions card with counts" | ✅ |
| "all three cards rendered" | ✅ |
| "shows loading skeletons for all three cards" | ✅ |
| "shows error for income card when loader fails" | ✅ |
| "shows error for expense card when loader fails" | ✅ |
| "shows error for total transactions when loader fails" | ✅ |
| "partial failure — expense fails while others succeed" | ✅ |

**Verdict:** All correct. The partial failure test is especially good — it verifies that when one card fails, the others still render (independent error boundaries per card).

---

### `z-StatsCard.test.tsx`

| Test | Verdict |
|------|---------|
| "renders label, value, and description" | ✅ |
| "renders empty description without error" | ✅ |
| "applies custom className" | ✅ |

**Verdict:** All correct. Simple presentational component, tested appropriately.

---

### `z-TotalTransactionsCard.test.tsx`

| Test | Verdict |
|------|---------|
| "renders transaction counts on success" | ✅ |
| "renders 'Total Transaksi' label" | ✅ |
| "shows loading skeleton initially" | ✅ |
| "shows error message when loader fails" | ✅ |

**Verdict:** All correct.

---

## 4. Login

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when all services are provided" | ✅ |
| "shows FreshForm when no cashiers exist" | ✅ |
| "shows LoginForm when cashiers exist" | ✅ |
| "shows error when loading cashiers fails" | ✅ |

**Verdict:** All correct. Covers the two branches (`cashiers.length === 0` → FreshForm, `cashiers.length > 0` → LoginForm) plus the error path.

---

### `z-FreshForm.test.tsx`

| Test | Verdict |
|------|---------|
| "renders heading 'Selamat Datang'" | ✅ |
| "renders instruction text" | ✅ |
| "renders name, password, and confirm password fields" | ✅ |
| "shows validation error when passwords do not match" | ✅ |
| "shows error when onAdd fails" | ✅ |
| "calls login with created user on success" | ✅ |

**Verdict:** All correct. The password-mismatch branch (`refine` in Zod schema) is the main validation unique to this form and it's tested.

---

### `z-LoginForm.test.tsx`

| Test | Verdict |
|------|---------|
| "renders heading 'Masuk'" | ✅ |
| "renders password field" | ✅ |
| "select shows capitalized cashier names" | ✅ |
| "submit button starts disabled" | ✅ |
| "shows error when onCheck fails" | ✅ |
| "calls login with correct user on success" | ✅ |

**Verdict:** All correct. 

🔴 **Missing:** No test for the `id === ""` submit-disabled branch. The form has `disabled={isSubmitting || form.state.values.id === ""}` — what happens when a user selects a cashier, types a password, then clears the select? Does the button become disabled again? The initial disabled state is tested but the dynamic re-disabling isn't.

---

## 5. Money

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when PocketService is provided" | ✅ |
| "renders heading" | ✅ |
| "shows loading skeleton while loader is pending" | ✅ |
| "shows error message when loader fails" | ✅ |
| "renders pocket list items" | ✅ |
| "renders 'Kantong Baru' button" | ✅ |
| "adding a new pocket makes it appear in the list" | ✅ |
| "shows error when add fails" | ✅ |

**Verdict:** All correct. Covers the standard CRUD + loading/error cycle.

---

### `z-NavList.test.tsx`

| Test | Verdict |
|------|---------|
| "renders all pocket names" | ✅ |
| "renders lastMoney values when present" | ✅ |
| "shows 'Masih kosong' when no lastMoney" | ✅ |

**Verdict:** All correct. The file explicitly says `DO NOT ADD stateful changes on pocket type` — acceptable since NavList is a display component. 

🔴 **Missing:** No test for drag-and-drop reorder. The component has `DndContext`, `SortableContext`, `onDragEnd` with `arrayMove` logic. This is the primary user interaction on this component. Testing DnD is non-trivial in DOM tests, but entirely absent means zero coverage on the component's main feature.

---

### `z-NewPocket.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Kantong Baru' trigger button" | ✅ |
| "opens dialog when trigger is clicked" | ✅ |
| "dialog contains name field" | ✅ |
| "shows validation error when name is empty" | ✅ |
| "shows validation error when name exceeds 20 chars" | ✅ |
| "shows error when onAdd returns error" | ✅ |
| "dialog closes on successful add" | ✅ |
| "pressing Escape closes the dialog" | ✅ |

**Verdict:** All correct. Both Zod validation branches (`nonempty` → "tidak boleh kosong" and `max(20)` → "maksimal 20 karakter") are tested.

---

### `History/z-DeletePocket.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Hapus Kantong' button" | ✅ |
| "opens confirmation dialog" | ✅ |
| "shows error when delete fails" | ✅ |
| "closes with 'Batalkan' button" | ✅ |

**Verdict:** All correct.

🔴 **Missing:** Dialog close on successful delete. The error path is tested, but not the happy path where deletion succeeds and dialog closes.

---

### `History/z-DeleteRecord.test.tsx`

| Test | Verdict |
|------|---------|
| "renders delete trigger button" | ✅ |
| "opens confirmation dialog" | ✅ |
| "dialog shows money details" | ✅ |
| "closes on successful delete" | ✅ |
| "shows error when delete fails" | ✅ |

**Verdict:** All correct. Note: this one does test the successful close path unlike `z-DeletePocket`.

---

### `History/z-NameForm.test.tsx`

| Test | Verdict |
|------|---------|
| "renders input with default name value" | ✅ |
| "clears input and submits new name" | ✅ |
| "shows error when name is empty" | ⚠️ |

⚠️ **Weak test:** The `"shows error when name is empty"` test clears the input, presses Enter, and asserts the empty input still exists. The test itself admits: *"toast.error would fire, but we verify the input still exists."* 

The component uses `toast.error(parsed.error.issues[0]?.message)` when validation fails — a user sees a toast notification, not a form-level error. The test doesn't verify the toast fired or what message it showed. It only verifies the input didn't magically disappear (which is a meaningless check).

**Recommendation:** Either mock `sonner` toast and assert `toast.error` was called with `"Harus ada"`, or remove the test as it verifies nothing user-visible.

🔴 **Missing:** No test for the successful update path — `toast.success("Berhasil diperbarui")`.

---

## 6. Setting / Config

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when ConfigService is provided" | ✅ |
| "renders heading and description" | ✅ |
| "renders 'Tampilan' section heading" | ✅ |
| "shows initial size and theme from service" | ✅ |
| "size select round-trip through service injection" | ✅ |
| "theme select round-trip through service injection" | ✅ |

**Verdict:** All correct. The round-trip tests use `StatefullSize`/`StatefullTheme` classes with `useSyncExternalStore` to simulate real state changes causing re-renders.

---

### `z-SelectSize.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Ukuran' label" | ✅ |
| "shows 'Besar' when size is big" | ✅ |
| "shows 'Kecil' when size is small" | ✅ |
| "updates displayed value after selecting Kecil" | ✅ |

**Verdict:** All correct.

---

### `z-SelectTheme.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Tema' label" | ✅ |
| "shows 'Terang' when theme is light" | ✅ |
| "shows 'Gelap' when theme is dark" | ✅ |
| "updates displayed value after selecting Gelap" | ✅ |

**Verdict:** All correct.

---

## 7. Setting / Data

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when all services are provided" | ✅ |
| "renders heading and description" | ✅ |
| "renders 'Unduh Data' section" | ✅ |
| "renders 'Unggah Data' section" | ✅ |
| "renders download buttons" | ✅ |

**Verdict:** All correct. Purely structural rendering tests for the page layout.

---

### `z-ProductDownload.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Produk' heading and 'Unduh' button" | ✅ |
| "shows error when download fails" | ✅ |

🔴 **Missing:** No test for successful download. What does the user see when the download succeeds? (Toast? No visible change?)

---

### `z-RecordDownload.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Riwayat' heading and 'Unduh' button" | ✅ |
| "shows error when download fails" | ✅ |

🔴 **Missing:** Same — no successful download test.

---

## 8. Setting / Log

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when LogService is provided" | ✅ |
| "renders heading and description" | ✅ |
| "shows loading skeleton while loader is pending" | ✅ |
| "shows error when loader fails" | ✅ |
| "renders log lines on success" | ✅ |
| "renders 'Bersihkan' button" | ✅ |

**Verdict:** All correct.

---

### `z-ClearLog.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Bersihkan' button" | ✅ |
| "shows error when clear fails" | ✅ |

🔴 **Missing:** No test for successful clear. The component likely calls `onClear()` and either shows a toast or the log lines disappear. Neither path is tested.

---

## 9. Setting / Printer

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when PrinterService is provided" | ✅ |
| "renders heading and description" | ✅ |
| "shows loading while loader is pending" | ✅ |
| "shows error when loader fails" | ✅ |
| "renders 'Tes Cetak' button on success" | ✅ |

**Verdict:** All correct.

---

### `z-PrinterWidth.test.tsx`

| Test | Verdict |
|------|---------|
| "renders label" | ✅ |
| "shows current size as default value" | ✅ |
| "shows error when save fails" | ✅ |

🔴 **Significant missing coverage — Zod validation branches.** The `widthSchema` has **five** validation rules:
1. `nonempty("Harus ada")` — empty input
2. `transform → refine NaN ("Harus angka")` — non-number input
3. `refine isFinite ("Harus terbatas")` — Infinity input
4. `refine v > 10 ("Minimal 10mm")` — too small
5. `refine v < 200 ("Maksimal 200mm")` — too large

None of these user-reachable validation branches are tested. The component calls `setError(parsed.error.message)` when `safeParse` fails, and the error is rendered via `<TextError>`. A user just typing letters instead of numbers into the width field is a perfectly reachable path, and it has zero test coverage.

---

### `z-SelectPrinter.test.tsx`

| Test | Verdict |
|------|---------|
| "renders label" | ✅ |
| "shows printer name" | ✅ |
| "shows error when set fails" | ✅ |

**Verdict:** All correct but minimal.

🔴 **Missing:** The round-trip is not tested — when a user selects a different printer and `onSetPrinter` succeeds, does the displayed printer name update? The `SelectPrinter` component receives `printer` as a prop so this would require re-rendering the component with new props — but as-written the component unit test tests the error path only.

---

### `z-TestBtn.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Tes Cetak' button" | ✅ |
| "shows error when print fails" | ✅ |

🔴 **Missing:** No test for successful test print. `print` returns `null` on success — what does the user see?

---

## 10. Setting / Profile

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when all services are provided" | ✅ |
| "renders heading and description" | ✅ |
| "renders name form with current user name" | ✅ |
| "renders password change section" | ✅ |

**Verdict:** All correct.

---

### `z-NameForm.test.tsx`

| Test | Verdict |
|------|---------|
| "renders current user name in input" | ✅ |
| "shows error when update fails" | ✅ |

🔴 **Missing:** No test for the successful update path. The component sets `error` to `null` when `onUpdateName` returns `null`, and the `<TextError>{error}</TextError>` should render nothing. A user updating their name is a primary use case — zero coverage.

---

### `z-PasswordForm.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Ganti kata sandi' trigger" | ✅ |
| "expands form and shows password input on click" | ✅ |
| "shows error when update fails" | ✅ |

⚠️ **Minor:** The component has **no client-side validation** of the password — it passes whatever is typed directly to `onUpdatePassword`. The test types `"123"` and the mock returns `"Kata sandi terlalu pendek"`. This is a server-side error, perfectly reachable by the user. However, the component also has the `if (loading) return;` guard — there's no test that rapid double-clicks are prevented.

🔴 **Missing:** No test for successful password update. When `err === null`, the component sets `input` to `""` and calls `toast.success("Berhasil diperbarui")`. Neither the input clearing nor the toast is tested.

---

## 11. Setting / Shop

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when InfoService is provided" | ✅ |
| "renders heading and description" | ✅ |
| "shows loading while loader is pending" | ✅ |
| "shows error when loader fails" | ✅ |
| "renders form fields on success" | ✅ |

**Verdict:** All correct.

---

### `z-CashierCheckbox.test.tsx`

| Test | Verdict |
|------|---------|
| "renders label text" | ✅ |
| "checkbox is checked when showCashier is true" | ✅ |
| "checkbox is unchecked when showCashier is false" | ✅ |
| "shows error when update fails" | ✅ |

🔴 **Missing:** The successful toggle round-trip is untested. When a user clicks the checkbox and `onSetShowCashier` returns `null`, the checkbox should toggle without error. This is the primary user interaction — only the error branch is tested.

---

### `z-Info.test.tsx`

| Test | Verdict |
|------|---------|
| "renders form fields with current values" | ✅ |
| "renders 'Simpan' button" | ✅ |
| "shows error when save fails" | ✅ |

🔴 **Missing:** No test for successful save. What does the user see when `onSetInfo` returns `null`? (Toast success? No error?)

---

## 12. Social

### `page.test.tsx`

| Test | Verdict |
|------|---------|
| "resolves when SocialService is provided" | ✅ |
| "renders heading and description" | ✅ |
| "renders column headers" | ✅ |
| "shows loading skeleton while loader is pending" | ✅ |
| "shows error message when loader fails" | ✅ |
| "renders social list items" | ✅ |
| "renders empty state when no socials" | ✅ |
| "renders 'Tambah' button" | ✅ |
| "deleting a social removes it from the list" | ✅ |
| "adding a new social makes it appear in the list" | ✅ |
| "updating a social name mutates the store" | ✅ |
| "shows error when add fails" | ✅ |

**Verdict:** All correct. Comprehensive page-level integration tests.

---

### `z-NewSocial.test.tsx`

| Test | Verdict |
|------|---------|
| "renders 'Tambah' trigger button" | ✅ |
| "opens dialog when trigger is clicked" | ✅ |
| "dialog contains name and value fields" | ✅ |
| "shows error when onAdd returns error message" | ✅ |
| "clears error on successful subsequent submit" | ✅ |
| "dialog stays open when name is empty (validation blocks submit)" | ✅ |
| "closing dialog with 'Batal' button" | ✅ |
| "dialog closes on successful add" | ✅ |
| "shows validation error when value is empty" | ✅ |
| "pressing Escape closes the dialog" | ✅ |

**Verdict:** All correct. This is the gold-standard test file: validates both name and value independently, tests error clearing on retry, and covers all dialog interactions.

---

### `z-SocialList.test.tsx`

| Test | Verdict |
|------|---------|
| "renders all social items" | ✅ |
| "renders empty state when no socials" | ✅ |
| "shows error when name update fails" | ✅ |
| "updating name invokes onUpdate and mutates store" | ✅ |
| "updating value invokes onUpdate and mutates store" | ✅ |
| "delete dialog shows contact details" | ✅ |
| "delete dialog closes on success" | ✅ |
| "clicking Batal in delete dialog closes it" | ✅ |
| "pressing Escape in delete dialog closes it" | ✅ |
| "deleting a social removes it from the list" | ✅ |

**Verdict:** All correct. Excellent coverage: name update, value update, delete with full dialog interaction (open → details → cancel/escape/confirm).

---

## Summary

### 🚨 Broken Tests

| File | Test | Issue |
|------|------|-------|
| `Home/__test/z-NavGrid.test.tsx` | "hides admin-only nav cards" | `not.not.toBeNull()` — double negation, passes by accident. Fix to `.toBeNull()`. Six occurrences in this block. |

### ⚠️ Weak Tests

| File | Test | Issue |
|------|------|-------|
| `Money/History/__test/z-NameForm.test.tsx` | "shows error when name is empty" | Doesn't verify the toast — only checks input still exists. The test's own comment admits this. |

### 🔴 Missing Coverage (recommended additions)

| File | Missing Test |
|------|-------------|
| `Cashier/__test/z-NewCashier.test.tsx` | "dialog closes on successful add" (compare with `z-NewCustomer`) |
| `Money/__test/z-NavList.test.tsx` | Reorder / drag-and-drop interaction |
| `Money/History/__test/z-NameForm.test.tsx` | Successful update (toast success) |
| `Money/History/__test/z-DeletePocket.test.tsx` | Successful delete closes dialog |
| `Setting/Printer/__test/z-PrinterWidth.test.tsx` | All 5 Zod validation branches (empty, NaN, infinity, <10, >200) |
| `Setting/Printer/__test/z-SelectPrinter.test.tsx` | Successful printer selection round-trip |
| `Setting/Printer/__test/z-TestBtn.test.tsx` | Successful test print path |
| `Setting/Profile/__test/z-NameForm.test.tsx` | Successful name update path |
| `Setting/Profile/__test/z-PasswordForm.test.tsx` | Successful password update (input cleared + toast) |
| `Setting/Shop/__test/z-CashierCheckbox.test.tsx` | Successful checkbox toggle |
| `Setting/Shop/__test/z-Info.test.tsx` | Successful save path |
| `Setting/Data/__test/z-ProductDownload.test.tsx` | Successful download path |
| `Setting/Data/__test/z-RecordDownload.test.tsx` | Successful download path |
| `Setting/Log/__test/z-ClearLog.test.tsx` | Successful clear path |
| `Login/__test/z-LoginForm.test.tsx` | Submit button re-disables when id cleared after selection |

### Pattern Issue: Error-only Testing

A recurring pattern across the Setting tests and Money History tests is that the **error path is tested but the success path is not** (`z-NameForm`, `z-PasswordForm`, `z-CashierCheckbox`, `z-Info`, `z-PrinterWidth`, `z-TestBtn`, `z-SelectPrinter`, `z-ClearLog`, `z-ProductDownload`, `z-RecordDownload`). 

In all these components, the error path and success path are **equally reachable** by the user — in fact, the success path is the more common case. Testing only the error path gives a false sense of coverage.

**Recommendation:** For each of these components, add at minimum:
- Assert the success output (toast, cleared input, closed dialog, no error text)
- If the component uses toast (`sonner`), mock it and assert the success toast was called

### What's Done Well

- **Stateful mocks** using `useSyncExternalStore` are excellent — they enable true round-trip tests where mutations cause UI re-renders
- **Partial failure tests** in `StatisticsGrid` — verifies independent error boundaries per card
- **Scoped queries** in `Customer` and `Money` tests — using `within(dialog)` to avoid false positives from list items
- **Self-item branches** in `CashierList` — testing the admin's own row has text-only name, disabled role, no delete button
- **Validation branches** in `NewPocket` and `NewSocial` — both `nonempty` and `max(20)`/value-empty tested
