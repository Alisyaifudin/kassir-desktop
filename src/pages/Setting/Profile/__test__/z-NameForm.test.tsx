import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NameForm } from "../z-NameForm";
import { render } from "~/lib/render";

const mockUser = { name: "Budi", role: "admin" as const, id: "1" };

describe("NameForm", () => {
  test("renders current user name in input", () => {
    render(<NameForm user={mockUser} onUpdateName={async () => null} />);
    expect(screen.getByDisplayValue("Budi")).not.toBeNull();
  });

  test("shows error when update fails", async () => {
    const user = userEvent.setup();
    render(<NameForm user={mockUser} onUpdateName={async () => "Nama sudah dipakai"} />);

    const input = screen.getByDisplayValue("Budi");
    await user.clear(input);
    await user.type(input, "Budi Baru");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("saves successfully without error", async () => {
    const user = userEvent.setup();
    render(<NameForm user={mockUser} onUpdateName={async () => null} />);

    const input = screen.getByDisplayValue("Budi");
    await user.clear(input);
    await user.type(input, "Budi Baru");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.queryByText(/dipakai/i)).toBeNull();
    });
  });
});
