import { describe, test, expect, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NameForm } from "../z-NameForm";
import { render } from "~/lib/render";

const mockUser = { name: "Budi", role: "admin" as const, id: "1" };

describe("NameForm", () => {
  function renderForm(opts?: {
    onUpdateName?: (id: string, name: string) => Promise<string | null>;
  }) {
    return render(
      <NameForm
        user={mockUser}
        onUpdateName={opts?.onUpdateName ?? (() => Promise.resolve(null))}
      />,
    );
  }

  test("renders current user name in input", () => {
    renderForm();
    expect(screen.getByDisplayValue("Budi")).toBeInTheDocument();
  });

  test("calls onUpdateName on submit with new name", async () => {
    const onUpdate = mock(async (_id: string, _name: string) => null);
    const user = userEvent.setup();
    renderForm({ onUpdateName: onUpdate });

    const input = screen.getByDisplayValue("Budi");
    await user.clear(input);
    await user.type(input, "Budi Baru");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("1", "Budi Baru");
    });
  });

  test("shows error when update fails", async () => {
    const onUpdate = mock(async () => "Nama sudah dipakai");
    const user = userEvent.setup();
    renderForm({ onUpdateName: onUpdate });

    const input = screen.getByDisplayValue("Budi");
    await user.clear(input);
    await user.type(input, "Budi Baru");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Nama sudah dipakai")).toBeInTheDocument();
  });
});
