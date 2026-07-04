import { describe, test, expect, mock } from "bun:test";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CashierList } from "../z-CashierList";
import { render } from "~/lib/render";
import type { Cashier } from "~/services/cashier";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockCashiers: Cashier[] = [
  { name: "Budi", role: "admin", id: "1" },
  { name: "Ani", role: "user", id: "2" },
  { name: "Citra", role: "user", id: "3" },
];

const currentUser: Cashier = { name: "Budi", role: "admin", id: "1" };

function renderList(opts?: {
  cashiers?: Cashier[];
  currentUser?: Cashier;
  onDelete?: (id: string) => Promise<string | null>;
  onUpdateName?: (id: string, name: string) => Promise<string | null>;
  onUpdateRole?: (id: string, role: DBNamespace.Role) => Promise<string | null>;
}) {
  return render(
    <CashierList
      useCashiers={() => opts?.cashiers ?? mockCashiers}
      useUser={() => opts?.currentUser ?? currentUser}
      onDelete={opts?.onDelete ?? (() => Promise.resolve(null))}
      onUpdateName={opts?.onUpdateName ?? (() => Promise.resolve(null))}
      onUpdateRole={opts?.onUpdateRole ?? (() => Promise.resolve(null))}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests — pure component, no Effect
// ---------------------------------------------------------------------------

describe("CashierList", () => {
  test("renders all cashier items", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByText("Budi")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Ani")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Citra")).toBeInTheDocument();
    });
  });

  test("renders empty list when no cashiers", () => {
    renderList({ cashiers: [] });
    const container = document.querySelector(".flex.flex-col.gap-2");
    expect(container).toBeInTheDocument();
    expect(container?.children.length).toBe(0);
  });

  test("passes currentUserName to CashierItem — self item renders as text", async () => {
    renderList({ currentUser: { name: "Budi", role: "admin", id: "1" } });
    await waitFor(() => {
      const budi = screen.getByText("Budi");
      expect(budi.tagName).toBe("P");
    });
  });

  test("passes onUpdateName callback — editing another user calls it", async () => {
    const onUpdateName = mock(async (_id: string, _name: string) => null);
    const user = userEvent.setup();
    renderList({ onUpdateName });

    await waitFor(() => screen.getByDisplayValue("Ani"));
    const input = screen.getByDisplayValue("Ani");
    await user.clear(input);
    await user.type(input, "Ani Baru");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(onUpdateName).toHaveBeenCalledWith("2", "Ani Baru");
    });
  });

  test("passes onDelete callback — confirm dialog calls it", async () => {
    const onDelete = mock(async (_id: string) => null);
    const user = userEvent.setup();
    renderList({ onDelete });

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraInput = screen.getByDisplayValue("Citra");
    const citraForm = citraInput.closest("form")!;
    const deleteBtn = within(citraForm).getByRole("button");
    await user.click(deleteBtn);

    await waitFor(() => screen.getByText(/yakin\?/i));
    const hapusBtn = screen.getByRole("button", { name: /hapus/i });
    await user.click(hapusBtn);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("3");
    });
  });
});
