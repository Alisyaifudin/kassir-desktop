import { describe, test, expect, mock } from "bun:test";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SocialList } from "../z-SocialList";
import { render } from "~/lib/render";
import { StatefullSocials } from "./mock";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderList(opts?: {
  state?: StatefullSocials;
  onUpdate?: (
    id: string,
    name: string,
    value: string,
  ) => Promise<string | null>;
  onDelete?: (id: string) => Promise<string | null>;
}) {
  const state = opts?.state ?? new StatefullSocials();
  return render(
    <SocialList
      useSocials={() => state.useSocials()}
      onUpdate={
        opts?.onUpdate ??
        ((id, name, value) => {
          state.update(id, name, value);
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
// Tests
// ---------------------------------------------------------------------------

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
    renderList({ state: new StatefullSocials([]) });
    expect(screen.getByText(/---belum ada---/i)).not.toBeNull();
  });

  // -----------------------------------------------------------------------
  // Name update
  // -----------------------------------------------------------------------

  test("shows error when name update fails", async () => {
    const user = userEvent.setup();
    renderList({ onUpdate: async () => "Nama sudah dipakai" });

    await waitFor(() => screen.getByDisplayValue("Instagram"));
    const input = screen.getByDisplayValue("Instagram");
    await user.clear(input);
    await user.type(input, "IG Baru");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
  });

  test("updating name invokes onUpdate and mutates store", async () => {
    const user = userEvent.setup();
    const state = new StatefullSocials();
    const onUpdate = mock(
      async (id: string, name: string, value: string) => {
        state.update(id, name, value);
        return null;
      },
    );
    renderList({ state, onUpdate });

    await waitFor(() => screen.getByDisplayValue("Instagram"));
    const input = screen.getByDisplayValue("Instagram");

    await user.clear(input);
    await user.type(input, "IG");
    await user.keyboard("{Enter}");

    const form = input.closest("form")!;
    await waitFor(() => {
      const errors = form.querySelectorAll(".text-destructive");
      expect(errors.length).toBe(0);
    });

    expect(onUpdate).toHaveBeenCalledWith("1", "IG", "@tokokita");
    expect(state.socials.find((s) => s.id === "1")?.name).toBe("IG");
  });

  // -----------------------------------------------------------------------
  // Value update
  // -----------------------------------------------------------------------

  test("updating value invokes onUpdate and mutates store", async () => {
    const user = userEvent.setup();
    const state = new StatefullSocials();
    const onUpdate = mock(
      async (id: string, name: string, value: string) => {
        state.update(id, name, value);
        return null;
      },
    );
    renderList({ state, onUpdate });

    await waitFor(() => screen.getByDisplayValue("@tokokita"));
    const input = screen.getByDisplayValue("@tokokita");

    await user.clear(input);
    await user.type(input, "@new_handle");
    await user.keyboard("{Enter}");

    const form = input.closest("form")!;
    await waitFor(() => {
      const errors = form.querySelectorAll(".text-destructive");
      expect(errors.length).toBe(0);
    });

    expect(onUpdate).toHaveBeenCalledWith("1", "Instagram", "@new_handle");
    expect(state.socials.find((s) => s.id === "1")?.value).toBe(
      "@new_handle",
    );
  });

  // -----------------------------------------------------------------------
  // Delete dialog
  // -----------------------------------------------------------------------

  test("delete dialog shows contact details", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Facebook"));
    const fbForm = screen.getByDisplayValue("Facebook").closest("form")!;
    const buttons = within(fbForm).getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1];
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/hapus kontak/i)).not.toBeNull();
      expect(screen.getByText(/facebook/i)).not.toBeNull();
      expect(screen.getByText(/toko kita/i)).not.toBeNull();
    });
  });

  test("delete dialog closes on success", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Facebook"));
    const fbForm = screen.getByDisplayValue("Facebook").closest("form")!;
    const buttons = within(fbForm).getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByText(/hapus kontak/i));
    await user.click(screen.getByRole("button", { name: /hapus/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("clicking Batal in delete dialog closes it", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Facebook"));
    const fbForm = screen.getByDisplayValue("Facebook").closest("form")!;
    const buttons = within(fbForm).getAllByRole("button");
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

    await waitFor(() => screen.getByDisplayValue("Facebook"));
    const fbForm = screen.getByDisplayValue("Facebook").closest("form")!;
    const buttons = within(fbForm).getAllByRole("button");
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

  test("deleting a social removes it from the list", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() => screen.getByDisplayValue("Facebook"));
    const fbForm = screen.getByDisplayValue("Facebook").closest("form")!;
    const buttons = within(fbForm).getAllByRole("button");
    const deleteBtn = buttons[buttons.length - 1];
    await user.click(deleteBtn);

    await waitFor(() => screen.getByText(/hapus kontak/i));
    await user.click(screen.getByRole("button", { name: /hapus/i }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Facebook")).toBeNull();
    });

    expect(screen.getByDisplayValue("Instagram")).not.toBeNull();
    expect(screen.getByDisplayValue("WhatsApp")).not.toBeNull();
  });
});
