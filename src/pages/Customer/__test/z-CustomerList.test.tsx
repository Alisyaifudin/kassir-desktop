import { describe, test, expect } from "bun:test";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerList } from "../z-CustomerList";
import { render } from "~/lib/render";
import type { Customer } from "~/services/customer/type";

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
    renderList({ customers: [] });
    const container = document.querySelector(".flex.flex-col.gap-3");
    expect(container).not.toBeNull();
    expect(container?.children.length).toBe(0);
  });

  test("shows error when update fails", async () => {
    const user = userEvent.setup();
    renderList({ onUpdate: async () => "Nama sudah dipakai" });

    await waitFor(() => screen.getByDisplayValue("Ani"));
    const input = screen.getByDisplayValue("Ani");
    await user.clear(input);
    await user.type(input, "Ani Baru");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("delete dialog closes on success", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Citra"));
    const citraInput = screen.getByDisplayValue("Citra");
    const citraForm = citraInput.closest("form")!;
    const buttons = within(citraForm).getAllByRole("button");
    const deleteBtn = buttons[1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByText(/yakin\?/i));
    expect(screen.getByText(/nama: citra/i)).not.toBeNull();
    expect(screen.getByText(/hp: 08561234567/i)).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /hapus/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
