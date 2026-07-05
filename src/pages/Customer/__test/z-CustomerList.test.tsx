import { describe, test, expect, mock } from "bun:test";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerList } from "../z-CustomerList";
import { render } from "~/lib/render";
import { StatefullCustomers } from "./mock";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderList(opts?: {
  state?: StatefullCustomers;
  onUpdate?: (id: string, name: string, phone: string) => Promise<string | null>;
  onDelete?: (id: string) => Promise<string | null>;
}) {
  const state = opts?.state ?? new StatefullCustomers();
  return render(
    <CustomerList
      useCustomers={() => state.useCustomers()}
      onUpdate={
        opts?.onUpdate ??
        ((id, name, phone) => {
          state.set(id, name, phone);
          return Promise.resolve(null);
        })
      }
      onDelete={
        opts?.onDelete ??
        ((id) => {
          state.delete(id);
          return Promise.resolve(null);
        })
      }
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests — pure component, no Effect, stateful mocks for full round-trip
// ---------------------------------------------------------------------------

describe("CustomerList", () => {
  test("renders all customer items with name and phone", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Budi")).not.toBeNull();
      expect(screen.getByDisplayValue("Ani")).not.toBeNull();
      expect(screen.getByDisplayValue("Citra")).not.toBeNull();
      expect(screen.getByDisplayValue("08123456789")).not.toBeNull();
      expect(screen.getByDisplayValue("08987654321")).not.toBeNull();
      expect(screen.getByDisplayValue("08561234567")).not.toBeNull();
    });
  });

  test("renders empty list when no customers", () => {
    renderList({ state: new StatefullCustomers([]) });
    const container = document.querySelector(".flex.flex-col.gap-3");
    expect(container).not.toBeNull();
    expect(container?.children.length).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Name update
  // -----------------------------------------------------------------------

  test("shows error when name update fails", async () => {
    const user = userEvent.setup();
    renderList({ onUpdate: async () => "Nama sudah dipakai" });

    await waitFor(() => screen.getByDisplayValue("Ani"));
    const input = screen.getByDisplayValue("Ani");
    await user.clear(input);
    await user.type(input, "Ani Baru");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("updating name invokes onUpdate and shows no error", async () => {
    const user = userEvent.setup();
    const state = new StatefullCustomers();
    const onUpdate = mock(
      async (id: string, name: string, phone: string) => {
        state.set(id, name, phone);
        return null;
      },
    );
    renderList({ state, onUpdate });

    await waitFor(() => screen.getByDisplayValue("Ani"));
    const input = screen.getByDisplayValue("Ani");

    await user.clear(input);
    await user.type(input, "Ani Baru");
    await user.keyboard("{Enter}");

    // No error should appear
    const form = input.closest("form")!;
    await waitFor(() => {
      const errors = form.querySelectorAll(".text-destructive");
      expect(errors.length).toBe(0);
    });

    // Callback was invoked with correct arguments
    expect(onUpdate).toHaveBeenCalledWith("2", "Ani Baru", "08987654321");

    // Store was mutated
    expect(state.customers.find((c) => c.id === "2")?.name).toBe("Ani Baru");
  });

  // -----------------------------------------------------------------------
  // Delete dialog
  // -----------------------------------------------------------------------

  test("delete dialog shows customer name and phone", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
    const buttons = within(citraForm).getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1];
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/yakin\?/i)).not.toBeNull();
      expect(screen.getByText(/nama: citra/i)).not.toBeNull();
      expect(screen.getByText(/hp: 08561234567/i)).not.toBeNull();
    });
  });

  test("delete dialog closes on success", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
    const buttons = within(citraForm).getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByText(/yakin\?/i));
    await user.click(screen.getByRole("button", { name: /hapus/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("clicking Batal in delete dialog closes it", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
    const buttons = within(citraForm).getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByRole("dialog"));
    await user.click(screen.getByRole("button", { name: /batal/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("pressing Escape in delete dialog closes it", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
    const buttons = within(citraForm).getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByRole("dialog"));
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Stateful round-trip: delete removes from DOM
  // -----------------------------------------------------------------------

  test("deleting a customer removes it from the list", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
    const buttons = within(citraForm).getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByText(/yakin\?/i));
    await user.click(screen.getByRole("button", { name: /hapus/i }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Citra")).toBeNull();
    });

    expect(screen.getByDisplayValue("Budi")).not.toBeNull();
    expect(screen.getByDisplayValue("Ani")).not.toBeNull();
  });
});
