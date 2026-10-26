import { describe, expect, mock, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import { Effect, Stream } from "effect";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import type { User } from "~/services/auth";

/**
 * The role guard that replaced the old `admin` route middleware. A non-admin is
 * sent to the fallback rather than shown an empty page — and an admin's screen
 * must not navigate at all.
 *
 * Stubbed at the service boundary (the real `useUser` under it), not by mocking
 * the hook: the point is that the guard reads the session the app really has.
 */
let current: User = { id: "c1", name: "Ani", role: "admin" };

mock.module("~/services", () => ({
  service: {
    auth: {
      get changes() {
        return Stream.make(current);
      },
      get: () => Effect.succeed(current),
    },
  },
}));

const { AdminOnly } = await import("./AdminOnly");

let path = "";

function Probe({ fallback }: { fallback?: string }) {
  path = useLocation().pathname;
  return (
    <AdminOnly fallback={fallback}>
      <span>layar admin</span>
    </AdminOnly>
  );
}

function renderAt(entry = "/cashier", fallback?: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="*" element={<Probe fallback={fallback} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminOnly", () => {
  test("an admin sees the screen and stays where they are", async () => {
    current = { id: "c1", name: "Ani", role: "admin" };
    renderAt();

    expect(await screen.findByText("layar admin")).toBeDefined();
    expect(path).toBe("/cashier");
  });

  test("a non-admin is sent to the default fallback", async () => {
    current = { id: "c2", name: "Budi", role: "user" };
    renderAt("/cashier");

    await waitFor(() => expect(path).toBe("/setting"));
    expect(screen.queryByText("layar admin")).toBeNull();
  });

  test("a caller can name its own fallback", async () => {
    current = { id: "c2", name: "Budi", role: "user" };
    renderAt("/cashier", "/login");

    await waitFor(() => expect(path).toBe("/login"));
    expect(screen.queryByText("layar admin")).toBeNull();
  });
});
