# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: React 19 + Vite + TypeScript inside a Tauri 2 desktop shell, Effect
services over a local SQLite database (`tauri-plugin-sql`), Tailwind v4 + shadcn-style
components, React Router (hash router). Not a decision to make — recorded so later work
does not re-litigate it.

## Users

One shop, two people, one screen. The **admin/owner** reconciles the day, corrects a
mis-rung sale, settles debt, and reads the shop's money; the **cashier** rings sales up
and answers a customer asking what they were charged. Both open this page about equally,
mostly at the owner's desk with a mouse and keyboard and a wide monitor, at roughly
60–80cm. The app also runs on the counter's touchscreen PC, so pointer targets still have
to hold up under a finger.

## Product Purpose

Kassir is the cashier for a small Indonesian shop: it records sales (penjualan) and
purchases (pembelian), keeps stock lots and cost prices honest, tracks credit ("utang")
and customer debt, and prints the paper receipt a customer takes home. Success is a shop
that can answer "what happened to this money?" for any transaction, months later, without
a spreadsheet.

## Positioning

Every record is written once and then frozen. The app keeps the *whole* transaction as it
was rung up — lines, per-lot cost, discounts, extras, split payments, rounding, the
counterparty — instead of a mutable row per day. Corrections are therefore new facts
(a replacement record, a new cart, a new paid date), never silent rewrites of history.
That is why the record page exists at all: it is the evidence, and the actions on it are
corrections with a paper trail.

## Operating Context

- Offline-first, single machine, no server in the loop. The database is a local SQLite
  file; receipts go to a thermal printer.
- Money is in rupiah with a per-record precision (`fix`), rounding rules, and change
  (`kembalian`). Small numbers matter: a rounding of 500 and a change of 2.000 are read
  as carefully as a total of 125.000.
- Language is Indonesian throughout, with these terms fixed: Jual/Masuk (sale),
  Beli/Keluar (purchase), Kredit/Utang, Lunas, Pembulatan, Kembalian, Kasir, Pemasok,
  Pelanggan, Catatan, Resi.
- Two roles: `admin` and `cashier`. Dates, debt settlement, mode changes and deletes are
  admin-only; note editing and copying a record into a new cart are not.
- The app has two UI sizes (`big`/`small`), set per shop, and both must stay usable.
- The record page is reached from the day list (`/records`, right-hand pane), from the
  comprehensive search, from the debt table, and from the moment after a sale
  ("Lihat detail").

## Capabilities and Constraints

Confirmed on this page: one record with its lines (name, unit price, cost/modal for
purchases, qty in pcs, line total), its discounts indented under their line, its extras
(charges/deductions with running totals), the settlement (subtotal, rounding, total,
payment, change, methods, credit state), the counterparty, the note, the cashier, the
record id, created/paid/credit dates, a printable receipt reproduction, and the actions:
edit note, move paid/credit date (admin), change mode (admin, replaces the record), open a
credit, settle a debt (admin), copy into a new cart ("Jadikan Transaksi"), delete (admin).

Constraints that are not negotiable: the receipt tab must keep reproducing the printer's
paper output (the same words, the same totals, a 400px-wide sheet); the record id is a
ULID and is long; a record can legally have no lines at all (imported/legacy rows), and
one screen must survive that; the page must never invent a fact the record does not carry
(no "profit", no estimates, no rounded display of a stored precision).

Undecided: whether the page should ever show cross-record context (the day's running
total, the product's other sales) — nothing in the app does today.

## Brand Commitments

The name is Kassir ("kasir", cashier). Voice is plain Indonesian, lowercase-calm,
unhyped: labels name the thing, errors say what happened and what to do. No marketing
tone, no exclamation, no emoji. Typeface is Noto Sans (self-hosted variable face); the
interface is a workhorse UI, not a display surface.

## Evidence on Hand

Real code and schema in `src/services/record/`, the receipt printer path in
`src/pages/Record/Item/z-Receipt/`, and the existing page in `src/pages/Record/Item/`.
The app ships example screenshots in `docs/static/img/`. No testimonials, customers,
benchmarks, or pricing claims exist and none may be invented.

## Product Principles

1. **The record is evidence.** Show what was written, at the precision it was written,
   and make every correction visibly a new fact rather than an edit of the past.
2. **Money reads as a column.** Totals align on the digit; a reader's eye should be able
   to run down the right edge and land on the same answer twice.
3. **Two readers, one page.** The cashier needs "what did they pay?" in a second; the
   owner needs "is this right?" in a minute. The same page must answer both without
   hiding either.
4. **Frozen is a feature.** Say so where it matters — the receipt, the id, the dates —
   instead of implying everything is editable.
5. **Quiet until it matters.** Colour and weight are reserved for state (credit, paid,
   destructive correction), never for decoration.

## Accessibility & Inclusion

Keyboard-first is a real requirement: the rest of the app is driven by function keys and
arrow-key grids, and the record page is reached from a keyboard-navigable list. Contrast
must hold in both light and dark themes. Touch must work on the counter PC. No
product-specific screen-reader commitment was established; keep semantics and focus
order honest anyway.
