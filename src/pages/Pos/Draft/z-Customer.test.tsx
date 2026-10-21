import { describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Stream } from "effect";
import type { Draft } from "~/services/transaction";

/**
 * The customer field is optional to the *sale*, not to the *record*: the whole
 * complaint in the audit was that a failed `customer.get.changes` returned
 * `null`, so the field disappeared and the sale was committed without a
 * customer with nothing in the UI or the log to say why. A failed read must be
 * visible and the field must stay usable.
 */
mock.module("~/services", () => ({
  service: {
    customer: {
      get: {
        changes: Stream.fail({ _tag: "CustomerError", message: "database is locked" }),
      },
    },
    transaction: {
      set: {
        customer: () => undefined,
        customerName: () => undefined,
        customerPhone: () => undefined,
      },
      reportError: () => undefined,
    },
  },
}));

const { Customer } = await import("./z-Customer");

const draft = {
  id: "d1",
  customerId: null,
  customerName: "",
  customerPhone: "",
} as Draft;

describe("Customer field", () => {
  test("a failed read is announced and the field stays usable", async () => {
    render(<Customer draft={draft} />);

    // The alert lands asynchronously: `useStream` subscribes on mount.
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Daftar pelanggan gagal dimuat");
    expect(alert.textContent).toContain("database is locked");
    // Not silently absent: the combobox is still there to type a new name into.
    expect(screen.getByPlaceholderText("Cari atau pelanggan baru")).toBeTruthy();
  });
});
