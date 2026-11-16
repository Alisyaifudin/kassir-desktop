import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useSelected, useUnselect } from "./use-selected";

/**
 * Which record the detail pane shows, in the URL so a refresh keeps it open.
 * Clicking the row that is already open closes it — the second click is how the
 * pane is dismissed — and clearing it is a delete, not `selected=`.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/records") {
  return renderHook(() => useSelected(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useSelected", () => {
  test("nothing selected by default", () => {
    expect(harness().result.current[0]).toBeNull();
  });

  test("reads the open record from the URL", () => {
    expect(harness("/records?selected=r1").result.current[0]).toBe("r1");
  });

  test("clicking a row opens it and keeps the filters", () => {
    const { result } = harness("/records?query=kopi");

    act(() => result.current[1]("r1"));

    expect(params().get("selected")).toBe("r1");
    expect(params().get("query")).toBe("kopi");
  });

  test("clicking the open row again closes it", () => {
    const { result } = harness("/records?selected=r1");

    act(() => result.current[1]("r1"));

    expect(params().has("selected")).toBe(false);
  });

  test("clearing is a delete", () => {
    const { result } = harness("/records?selected=r1");

    act(() => result.current[1](null));

    expect(params().has("selected")).toBe(false);
  });
});

describe("useUnselect", () => {
  test("closes whatever is open", () => {
    function CloseButton() {
      const unselect = useUnselect();
      return (
        <button type="button" onClick={unselect}>
          tutup
        </button>
      );
    }

    render(
      <MemoryRouter initialEntries={["/records?selected=r1&query=kopi"]}>
        <Probe />
        <CloseButton />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("tutup"));

    expect(params().has("selected")).toBe(false);
    expect(params().get("query")).toBe("kopi");
  });
});
