import { describe, expect, spyOn, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { createErrorBoundary, createManyErrorBoundary } from "./createErrorBoundary";

/**
 * The per-feature boundaries: a page's own typed errors are caught here and shown
 * as that page's fallback, while anything else is rethrown so the route boundary
 * (or an outer feature's boundary) still gets it. Swallowing a foreign error
 * would leave a screen rendering a fallback for a failure it does not understand.
 */
class StokError extends Error {}
class KasError extends Error {}

function Boom({ error }: { error: Error }): never {
  throw error;
}

function Fallback({ error }: { error: StokError | KasError }) {
  return <p data-testid="fallback">{error.message}</p>;
}

describe("createErrorBoundary", () => {
  test("children render when nothing throws", () => {
    const Boundary = createErrorBoundary(StokError);
    render(
      <Boundary fallback={Fallback}>
        <span>isi halaman</span>
      </Boundary>,
    );

    expect(screen.getByText("isi halaman")).toBeDefined();
  });

  test("a matching error renders the fallback with the typed error", () => {
    const Boundary = createErrorBoundary(StokError);
    const error = new StokError("Stok Kopi tidak mencukupi");
    const logged = spyOn(console, "error").mockImplementation(() => {});

    render(
      <Boundary fallback={Fallback}>
        <Boom error={error} />
      </Boundary>,
    );
    logged.mockRestore();

    expect(screen.getByTestId("fallback").textContent).toBe("Stok Kopi tidak mencukupi");
  });

  test("an error of another type is rethrown to an ancestor boundary", () => {
    const Outer = createErrorBoundary(KasError);
    const Inner = createErrorBoundary(StokError);
    const logged = spyOn(console, "error").mockImplementation(() => {});

    render(
      <Outer fallback={Fallback}>
        <Inner fallback={Fallback}>
          <Boom error={new KasError("Kas tidak cocok")} />
        </Inner>
      </Outer>,
    );
    logged.mockRestore();

    // The inner boundary refuses it; the outer one is the one that matches.
    expect(screen.getByTestId("fallback").textContent).toBe("Kas tidak cocok");
  });
});

describe("createManyErrorBoundary", () => {
  test("catches any of the listed classes", () => {
    const Boundary = createManyErrorBoundary(StokError, KasError);
    const logged = spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(
      <Boundary fallback={Fallback}>
        <Boom error={new KasError("Kas tidak cocok")} />
      </Boundary>,
    );
    expect(screen.getByTestId("fallback").textContent).toBe("Kas tidak cocok");
    unmount();

    render(
      <Boundary fallback={Fallback}>
        <Boom error={new StokError("Stok habis")} />
      </Boundary>,
    );
    logged.mockRestore();

    expect(screen.getByTestId("fallback").textContent).toBe("Stok habis");
  });
});
