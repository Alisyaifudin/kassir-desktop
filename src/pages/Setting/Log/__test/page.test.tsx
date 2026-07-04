import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import { Effect, Layer } from "effect";
import { LogService, LogError } from "~/services/log";
import page from "../page";
import { render } from "~/lib/render";

function makeLogService(opts?: {
  loader?: () => Effect.Effect<void, LogError>;
  lines?: string[];
}): typeof LogService.Service {
  return {
    loader: opts?.loader ?? (() => Effect.void),
    useLog: () => opts?.lines ?? ["[INFO] App started", "[ERROR] Something broke"],
    clear: () => Effect.void,
    put: () => {},
  };
}

describe("page (Effect)", () => {
  test("resolves when LogService is provided", () => {
    const program = Effect.gen(function* () { yield* page; });
    const layer = Layer.succeed(LogService, makeLogService());
    expect(() => Effect.runSync(Effect.provide(program, layer))).not.toThrow();
  });
});

describe("Page component", () => {
  function renderPage(opts?: Parameters<typeof makeLogService>[0]) {
    const Page = Effect.runSync(
      page.pipe(Effect.provideService(LogService, makeLogService(opts))),
    );
    return render(<Page />);
  }

  test("renders heading and description", async () => {
    renderPage();
    expect(await screen.findByText(/log aplikasi/i)).toBeInTheDocument();
    expect(screen.getByText(/pantau aktivitas dan kesalahan sistem/i)).toBeInTheDocument();
  });

  test("shows loading skeleton while loader is pending", async () => {
    const deferred = Promise.withResolvers<void>();
    renderPage({ loader: () => Effect.promise(() => deferred.promise) });
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
    deferred.resolve();
    await waitFor(() => {
      expect(screen.queryByText(/log aplikasi/i)).toBeInTheDocument();
    });
  });

  test("shows error when loader fails", async () => {
    renderPage({ loader: () => Effect.fail(new LogError(new Error("Gagal"))) });
    expect(await screen.findByText("Gagal")).toBeInTheDocument();
  });

  test("renders log lines on success", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("[INFO] App started")).toBeInTheDocument();
      expect(screen.getByText("[ERROR] Something broke")).toBeInTheDocument();
    });
  });

  test("renders 'Bersihkan' button", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: /bersihkan/i })).toBeInTheDocument();
  });
});
