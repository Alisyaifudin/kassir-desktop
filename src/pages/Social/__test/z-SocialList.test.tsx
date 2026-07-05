import { describe, test, expect } from "bun:test";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SocialList } from "../z-SocialList";
import { render } from "~/lib/render";
import type { Social } from "~/services/social/type";

const mockSocials: Social[] = [
  { id: "1", name: "Instagram", value: "@tokokita", updatedAt: 1 },
  { id: "2", name: "WhatsApp", value: "08123456789", updatedAt: 1 },
  { id: "3", name: "Facebook", value: "Toko Kita", updatedAt: 1 },
];

function renderList(opts?: {
  socials?: Social[];
  onUpdate?: (id: string, name: string, value: string) => Promise<string | null>;
  onDelete?: (id: string) => Promise<string | null>;
}) {
  return render(
    <SocialList
      useSocials={() => opts?.socials ?? mockSocials}
      onUpdate={opts?.onUpdate ?? (() => Promise.resolve(null))}
      onDelete={opts?.onDelete ?? (() => Promise.resolve(null))}
    />,
  );
}

describe("SocialList", () => {
  test("renders all social items", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Instagram")).not.toBeNull();
      expect(screen.getByDisplayValue("@tokokita")).not.toBeNull();
      expect(screen.getByDisplayValue("WhatsApp")).not.toBeNull();
      expect(screen.getByDisplayValue("08123456789")).not.toBeNull();
      expect(screen.getByDisplayValue("Facebook")).not.toBeNull();
      expect(screen.getByDisplayValue("Toko Kita")).not.toBeNull();
    });
  });

  test("renders empty state when no socials", () => {
    renderList({ socials: [] });
    expect(screen.getByText(/---belum ada---/i)).not.toBeNull();
  });

  test("shows error when update fails", async () => {
    const user = userEvent.setup();
    renderList({ onUpdate: async () => "Nama sudah dipakai" });

    await waitFor(() => screen.getByDisplayValue("Instagram"));
    const input = screen.getByDisplayValue("Instagram");
    await user.clear(input);
    await user.type(input, "IG Baru");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("delete dialog closes on success", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Facebook"));
    const fbInput = screen.getByDisplayValue("Facebook");
    const fbForm = fbInput.closest("form")!;
    const buttons = within(fbForm).getAllByRole("button");
    const deleteBtn = buttons[1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByText(/hapus kontak/i));
    await user.click(screen.getByRole("button", { name: /hapus/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
