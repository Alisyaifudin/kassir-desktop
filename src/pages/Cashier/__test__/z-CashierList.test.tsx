import { describe, test, expect, mock } from "bun:test";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CashierList } from "../z-CashierList";
import { render } from "~/lib/render";
import { StatefullCashiers, StatefullUser } from "./mock";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderList(opts?: {
  state?: StatefullCashiers;
  userState?: StatefullUser;
  onDelete?: (id: string) => Promise<string | null>;
  onUpdateName?: (id: string, name: string) => Promise<string | null>;
  onUpdateRole?: (id: string, role: DBNamespace.Role) => Promise<string | null>;
}) {
  const state = opts?.state ?? new StatefullCashiers();
  const userState = opts?.userState ?? new StatefullUser();

  return render(
    <CashierList
      useCashiers={() => state.useCashiers()}
      useUser={() => userState.useUser()}
      onDelete={
        opts?.onDelete ??
        ((id) => {
          state.delete(id);
          return Promise.resolve(null);
        })
      }
      onUpdateName={
        opts?.onUpdateName ??
        ((id, name) => {
          state.setName(id, name);
          return Promise.resolve(null);
        })
      }
      onUpdateRole={
        opts?.onUpdateRole ??
        ((id, role) => {
          state.setRole(id, role);
          return Promise.resolve(null);
        })
      }
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests — pure component, no Effect, stateful mocks for full round-trip
// ---------------------------------------------------------------------------

describe("CashierList", () => {
  test("renders all cashier items", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByText("Budi")).not.toBeNull();
      expect(screen.getByDisplayValue("Ani")).not.toBeNull();
      expect(screen.getByDisplayValue("Citra")).not.toBeNull();
    });
  });

  test("renders empty list when no cashiers", () => {
    renderList({ state: new StatefullCashiers([]) });
    const container = document.querySelector(".flex.flex-col.gap-2");
    expect(container).not.toBeNull();
    expect(container?.children.length).toBe(0);
  });

  test("self item renders as text, not input", async () => {
    renderList();
    await waitFor(() => {
      const budi = screen.getByText("Budi");
      expect(budi.tagName).toBe("P");
    });
  });

  test("self item has disabled role select", async () => {
    renderList();
    await waitFor(() => screen.getByText("Budi"));

    const budiForm = screen.getByText("Budi").closest("form")!;
    const combobox = within(budiForm).getByRole("combobox");

    // Radix Select renders a disabled button for the trigger
    expect((combobox as HTMLButtonElement).disabled).toBe(true);
  });

  test("self item has no delete button", async () => {
    renderList();
    await waitFor(() => screen.getByText("Budi"));

    const budiForm = screen.getByText("Budi").closest("form")!;

    // Self item should not have a delete button at all
    expect(
      within(budiForm).queryByRole("button"),
    ).toBeNull();
  });

  test("shows error when name update fails", async () => {
    const user = userEvent.setup();
    renderList({ onUpdateName: async () => "Nama sudah dipakai" });

    await waitFor(() => screen.getByDisplayValue("Ani"));
    const input = screen.getByDisplayValue("Ani");
    await user.clear(input);
    await user.type(input, "Ani Baru");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("shows error when role update fails", async () => {
    const user = userEvent.setup();
    renderList({ onUpdateRole: async () => "Peran tidak valid" });

    await waitFor(() => screen.getByDisplayValue("Ani"));
    const aniForm = screen.getByDisplayValue("Ani").closest("form")!;
    const roleTrigger = within(aniForm).getByRole("combobox");

    await user.click(roleTrigger);
    await user.click(await screen.findByRole("option", { name: "Admin" }));

    expect(await screen.findByText("Peran tidak valid")).not.toBeNull();
  });

  test("shows validation error when name is empty on submit", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Ani"));
    const input = screen.getByDisplayValue("Ani");

    // Clear the input and submit with empty value
    await user.clear(input);
    await user.keyboard("{Enter}");

    // Validation error from Zod's nonempty("Harus ada") should appear
    expect(await screen.findByText(/Harus ada/i)).not.toBeNull();
  });

  // -----------------------------------------------------------------------
  // Delete dialog details
  // -----------------------------------------------------------------------

  test("delete dialog shows cashier name and confirmation", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
    const deleteBtn = within(citraForm).getByRole("button");
    await user.click(deleteBtn);

    // Dialog should show "Yakin?" and the cashier's name
    await waitFor(() => {
      expect(screen.getByText(/yakin\?/i)).not.toBeNull();
      expect(screen.getByText(/>Citra/i)).not.toBeNull();
    });
  });

  test("clicking Batal in delete dialog closes it", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
    const deleteBtn = within(citraForm).getByRole("button");
    await user.click(deleteBtn);

    await waitFor(() => screen.getByRole("dialog"));

    // Click "Batal"
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
    const deleteBtn = within(citraForm).getByRole("button");
    await user.click(deleteBtn);

    await waitFor(() => screen.getByRole("dialog"));

    // Press Escape — Radix Dialog closes on Escape
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Stateful round-trip: delete removes item from DOM
  // -----------------------------------------------------------------------

  test("deleting a cashier removes it from the list", async () => {
    const user = userEvent.setup();
    renderList();

    // Citra should exist initially
    await waitFor(() => screen.getByDisplayValue("Citra"));

    // Click delete on Citra's row
    const citraForm = screen.getByDisplayValue("Citra").closest("form")!;
    const deleteBtn = within(citraForm).getByRole("button");
    await user.click(deleteBtn);

    // Confirm deletion in dialog
    await waitFor(() => screen.getByText(/yakin\?/i));
    await user.click(screen.getByRole("button", { name: /hapus/i }));

    // Citra's input should be gone from the DOM
    await waitFor(() => {
      expect(screen.queryByDisplayValue("Citra")).toBeNull();
    });

    // Other items still exist
    expect(screen.getByText("Budi")).not.toBeNull();
    expect(screen.getByDisplayValue("Ani")).not.toBeNull();
  });

  // -----------------------------------------------------------------------
  // Stateful round-trip: name update invokes callback + mutates store
  // -----------------------------------------------------------------------

  test("updating name invokes onUpdateName and shows no error", async () => {
    const user = userEvent.setup();
    const state = new StatefullCashiers();
    const onUpdateName = mock(async (id: string, name: string) => {
      state.setName(id, name);
      return null;
    });
    renderList({ state, onUpdateName });

    // Find Ani's input
    await waitFor(() => screen.getByDisplayValue("Ani"));
    const input = screen.getByDisplayValue("Ani");

    // Type new name and submit
    await user.clear(input);
    await user.type(input, "Ani Baru");
    await user.keyboard("{Enter}");

    // No error should appear (proves callback returned null)
    const aniForm = input.closest("form")!;
    await waitFor(() => {
      const errors = aniForm.querySelectorAll(".text-destructive");
      expect(errors.length).toBe(0);
    });

    // Callback was invoked with correct arguments
    expect(onUpdateName).toHaveBeenCalledWith("2", "Ani Baru");

    // Store was mutated
    expect(state.cashiers.find((c) => c.id === "2")?.name).toBe("Ani Baru");
  });

  // -----------------------------------------------------------------------
  // Stateful round-trip: role change updates the select
  // -----------------------------------------------------------------------

  test("changing role updates the select value", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Ani"));

    // Find Ani's select trigger (combobox)
    const aniForm = screen.getByDisplayValue("Ani").closest("form")!;
    const comboboxes = within(aniForm).getAllByRole("combobox");
    // The combobox element whose textContent starts with "User"
    const roleTrigger = comboboxes.find(
      (c) => c.textContent?.includes("User"),
    )!;
    expect(roleTrigger).not.toBeNull();

    // Open the select popover
    await user.click(roleTrigger);

    // Click "Admin" option
    await user.click(await screen.findByRole("option", { name: "Admin" }));

    // The select trigger should now show "Admin"
    await waitFor(() => {
      expect(roleTrigger.textContent).toContain("Admin");
    });
  });
});
