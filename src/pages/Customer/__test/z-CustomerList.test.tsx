import { describe, test, expect, mock } from "bun:test";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerList } from "../z-CustomerList";
import { render } from "~/lib/render";
import type { Customer } from "~/services/customer/type";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockCustomers: Customer[] = [
  { name: "Budi", phone: "08123456789", id: "1" },
  { name: "Ani", phone: "08987654321", id: "2" },
  { name: "Citra", phone: "08561234567", id: "3" },
];

function renderList(opts?: {
  customers?: Customer[];
  onUpdate?: (id: string, name: string, phone: string) => Promise<string | null>;
  onDelete?: (id: string) => Promise<string | null>;
}) {
  return render(
    <CustomerList
      useCustomers={() => opts?.customers ?? mockCustomers}
      onUpdate={opts?.onUpdate ?? (() => Promise.resolve(null))}
      onDelete={opts?.onDelete ?? (() => Promise.resolve(null))}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CustomerList", () => {
  test("renders all customer items with name and phone", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Budi")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Ani")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Citra")).toBeInTheDocument();
      expect(screen.getByDisplayValue("08123456789")).toBeInTheDocument();
      expect(screen.getByDisplayValue("08987654321")).toBeInTheDocument();
      expect(screen.getByDisplayValue("08561234567")).toBeInTheDocument();
    });
  });

  test("renders empty list when no customers", () => {
    renderList({ customers: [] });
    const container = document.querySelector(".flex.flex-col.gap-3");
    expect(container).toBeInTheDocument();
    expect(container?.children.length).toBe(0);
  });

  test("passes onUpdate callback — editing name and pressing Enter calls it", async () => {
    const onUpdate = mock(async (_id: string, _name: string, _phone: string) => null);
    const user = userEvent.setup();
    renderList({ onUpdate });

    await waitFor(() => screen.getByDisplayValue("Ani"));
    const input = screen.getByDisplayValue("Ani");
    await user.clear(input);
    await user.type(input, "Ani Baru");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("2", "Ani Baru", "08987654321");
    });
  });

  test("passes onDelete callback — confirm dialog calls it", async () => {
    const onDelete = mock(async (_id: string) => null);
    const user = userEvent.setup();
    renderList({ onDelete });

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraInput = screen.getByDisplayValue("Citra");
    const citraForm = citraInput.closest("form")!;
    // Two buttons in the form: hidden submit + delete trigger. The delete trigger comes second.
    const buttons = within(citraForm).getAllByRole("button");
    const deleteBtn = buttons[1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByText(/yakin\?/i));
    // The delete dialog shows: "> Nama: Citra" and "> HP: 08561234567"
    expect(screen.getByText(/nama: citra/i)).toBeInTheDocument();
    expect(screen.getByText(/hp: 08561234567/i)).toBeInTheDocument();

    const hapusBtn = screen.getByRole("button", { name: /hapus/i });
    await user.click(hapusBtn);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("3");
    });
  });
});
