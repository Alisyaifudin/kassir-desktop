import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { SocialService, SocialError } from "~/services/social";
import page from "../page";
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

// ---------------------------------------------------------------------------
// Mock service
// ---------------------------------------------------------------------------

function makeSocialService(opts?: {
  loader?: () => Effect.Effect<void, SocialError>;
  socials?: Social[];
}): typeof SocialService.Service {
  const socials = opts?.socials ?? mockSocials;
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useSocials: () => socials,
    add: () => Effect.void,
    update: () => Effect.void,
    delete: () => Effect.void,
  };
}

// ---------------------------------------------------------------------------
// Test: page Effect
// ---------------------------------------------------------------------------

describe("page (Effect)", () => {
  test("resolves when SocialService is provided", () => {
    const program = Effect.gen(function* () {
      yield* page;
    });
    const layer = Layer.succeed(SocialService, makeSocialService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
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
    expect(await screen.findByRole("heading", { name: /kontak media sosial/i })).not.toBeNull();
    expect(screen.getByText(/kelola kontak yang muncul di struk transaksi/i)).not.toBeNull();
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
      loader: () => Effect.fail(new SocialError(new Error("Gagal memuat data"))),
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
      renderPage({ socials: [] });
      await waitFor(() => {
        expect(screen.getByText(/---belum ada---/i)).not.toBeNull();
      });
    });

    test("renders 'Tambah' button", async () => {
      renderPage();
      expect(await screen.findByRole("button", { name: /tambah/i })).not.toBeNull();
    });
  });
});
