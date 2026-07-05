import { describe, test, expect } from "bun:test";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Effect, Layer } from "effect";
import { SocialService, SocialError } from "~/services/social";
import page from "../page";
import { render } from "~/lib/render";
import { StatefullSocials, makeSocialService } from "./mock";

// ---------------------------------------------------------------------------
// Test: page Effect
// ---------------------------------------------------------------------------

describe("page (Effect)", () => {
  test("resolves when SocialService is provided", () => {
    const program = Effect.gen(function* () {
      yield* page;
    });
    const layer = Layer.succeed(SocialService, makeSocialService());
    expect(() =>
      Effect.runSync(Effect.provide(program, layer)),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test: Page component rendering
// ---------------------------------------------------------------------------

describe("Page component", () => {
  function renderPage(opts?: Parameters<typeof makeSocialService>[0]) {
    const Page = Effect.runSync(
      page.pipe(Effect.provideService(SocialService, makeSocialService(opts))),
    );
    return render(<Page />);
  }

  test("renders heading and description", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: /kontak media sosial/i }),
    ).not.toBeNull();
    expect(
      screen.getByText(/kelola kontak yang muncul di struk transaksi/i),
    ).not.toBeNull();
  });

  test("renders column headers", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Kontak")).not.toBeNull();
      expect(screen.getByText("Isian")).not.toBeNull();
    });
  });

  test("shows loading skeleton while loader is pending", async () => {
    const deferred = Promise.withResolvers<void>();
    renderPage({ loader: () => Effect.promise(() => deferred.promise) });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
    deferred.resolve();
    await waitFor(() => {
      expect(screen.queryByText(/kontak media sosial/i)).not.toBeNull();
    });
  });

  test("shows error message when loader fails", async () => {
    renderPage({
      loader: () =>
        Effect.fail(new SocialError(new Error("Gagal memuat data"))),
    });
    expect(await screen.findByText(/Gagal memuat data/i)).not.toBeNull();
  });

  describe("when loaded successfully", () => {
    test("renders social list items", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByDisplayValue("Instagram")).not.toBeNull();
        expect(screen.getByDisplayValue("@tokokita")).not.toBeNull();
        expect(screen.getByDisplayValue("WhatsApp")).not.toBeNull();
        expect(screen.getByDisplayValue("08123456789")).not.toBeNull();
      });
    });

    test("renders empty state when no socials", async () => {
      renderPage({ state: new StatefullSocials([]) });
      await waitFor(() => {
        expect(screen.getByText(/---belum ada---/i)).not.toBeNull();
      });
    });

    test("renders 'Tambah' button", async () => {
      renderPage();
      expect(
        await screen.findByRole("button", { name: /tambah/i }),
      ).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Integration: stateful round-trip
  // -----------------------------------------------------------------------

  describe("User interactions", () => {
    function renderPageWithState(socialState?: StatefullSocials) {
      const state = socialState ?? new StatefullSocials();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(SocialService, makeSocialService({ state })),
        ),
      );
      return render(<Page />);
    }

    test("deleting a social removes it from the list", async () => {
      const user = userEvent.setup();
      renderPageWithState();

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

    test("adding a new social makes it appear in the list", async () => {
      const user = userEvent.setup();
      renderPageWithState();

      await user.click(
        await screen.findByRole("button", { name: /tambah/i }),
      );
      const dialog = await screen.findByRole("dialog");

      await user.type(
        within(dialog).getByPlaceholderText("Nama Kontak"),
        "Telegram",
      );
      await user.type(
        within(dialog).getByPlaceholderText("Isian Kontak"),
        "@tele",
      );
      await user.click(within(dialog).getByRole("button", { name: /^tambah$/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue("Telegram")).not.toBeNull();
        expect(screen.getByDisplayValue("@tele")).not.toBeNull();
      });
    });

    test("updating a social name mutates the store", async () => {
      const user = userEvent.setup();
      const state = new StatefullSocials();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(SocialService, makeSocialService({ state })),
        ),
      );
      render(<Page />);

      await waitFor(() => screen.getByDisplayValue("Instagram"));
      const input = screen.getByDisplayValue("Instagram");

      await user.clear(input);
      await user.type(input, "IG");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        const form = input.closest("form")!;
        const errors = form.querySelectorAll(".text-destructive");
        expect(errors.length).toBe(0);
      });

      expect(
        state.socials.find((s) => s.id === "1")?.name,
      ).toBe("IG");
    });

    test("shows error when add fails", async () => {
      const user = userEvent.setup();
      const Page = Effect.runSync(
        page.pipe(
          Effect.provideService(
            SocialService,
            makeSocialService({ addError: "Nama sudah dipakai" }),
          ),
        ),
      );
      render(<Page />);

      await user.click(
        await screen.findByRole("button", { name: /tambah/i }),
      );
      const dialog = await screen.findByRole("dialog");

      await user.type(
        within(dialog).getByPlaceholderText("Nama Kontak"),
        "Instagram",
      );
      await user.type(
        within(dialog).getByPlaceholderText("Isian Kontak"),
        "@dup",
      );
      await user.click(within(dialog).getByRole("button", { name: /^tambah$/i }));

      expect(await screen.findByText("Nama sudah dipakai")).not.toBeNull();
      expect(screen.getByRole("dialog")).not.toBeNull();
    });
  });
});
