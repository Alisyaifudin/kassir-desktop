import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { Table, TableBody, TableCell, TableRow } from "./table";

/**
 * The shared `Table` used to mount `useScroll`, which rewrote the address bar
 * with `history.replaceState({}, "", location.pathname + "?scroll=N")` on every
 * scroll. The app is a hash router, so that threw the `#/route?params` away and
 * the next reload/restart opened at `/` instead of the screen the cashier was
 * on. A presentational primitive must not have navigation side effects.
 */
describe("Table", () => {
  test("scrolling leaves the hash-router location untouched", () => {
    window.location.hash = "#/records?day=2026-10-01&selected=r1";
    const before = window.location.href;

    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>baris</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const wrapper = container.querySelector("div");
    if (!wrapper) throw new Error("table wrapper missing");
    wrapper.scrollTop = 240;
    fireEvent.scroll(wrapper);

    expect(window.location.href).toBe(before);
    expect(window.location.hash).toBe("#/records?day=2026-10-01&selected=r1");
  });
});
