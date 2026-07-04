import { describe, test, expect, mock } from "bun:test";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SocialList } from "../z-SocialList";
import { render } from "~/lib/render";
import type { Social } from "~/services/social/type";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SocialList", () => {
  test("renders all social items", async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Instagram")).toBeInTheDocument();
      expect(screen.getByDisplayValue("@tokokita")).toBeInTheDocument();
      expect(screen.getByDisplayValue("WhatsApp")).toBeInTheDocument();
      expect(screen.getByDisplayValue("08123456789")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Facebook")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Toko Kita")).toBeInTheDocument();
    });
  });

  test("renders empty state when no socials", () => {
    renderList({ socials: [] });
    expect(screen.getByText(/---belum ada---/i)).toBeInTheDocument();
  });

  test("passes onUpdate callback — editing name and pressing Enter calls it", async () => {
    const onUpdate = mock(async (_id: string, _name: string, _value: string) => null);
    const user = userEvent.setup();
    renderList({ onUpdate });

    await waitFor(() => screen.getByDisplayValue("Instagram"));
    const input = screen.getByDisplayValue("Instagram");
    await user.clear(input);
    await user.type(input, "IG Baru");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("1", "IG Baru", "@tokokita");
    });
  });

  test("passes onDelete callback — confirm dialog calls it", async () => {
    const onDelete = mock(async (_id: string) => null);
    const user = userEvent.setup();
    renderList({ onDelete });

    await waitFor(() => screen.getByDisplayValue("Facebook"));
    const fbInput = screen.getByDisplayValue("Facebook");
    const fbForm = fbInput.closest("form")!;
    const buttons = within(fbForm).getAllByRole("button");
    const deleteBtn = buttons[1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByText(/hapus kontak/i));
    const hapusBtn = screen.getByRole("button", { name: /hapus/i });
    await user.click(hapusBtn);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("3");
    });
  });
});
