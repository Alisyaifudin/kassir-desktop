import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Search } from "./z-Search";

/**
 * The product search: the field paints, the page waits for the pause.
 *
 * Two things went wrong here before, in opposite directions, and both are what
 * these tests hold down:
 *
 * 1. A local copy pushed up after the pause, and the pause's answer — an *older
 *    prefix* of the same word — was adopted back into the field mid-word:
 *    `hanasui` came out `hansui`.
 * 2. The "fix" for (1) deleted the local copy and wired the field straight to
 *    the URL, so every keystroke was a router navigation and a page render. A
 *    barcode scanner types thirteen characters in a few dozen milliseconds and
 *    only two or three survived, because the field kept being rendered back
 *    down to a query the router had not caught up with; `Backspace` was a page
 *    render per deletion.
 *
 * So: the field is local again, the URL is written once after `SEARCH_DELAY`,
 * and the echo guard from (1) stays — a `q` equal to the one this bar sent is
 * never adopted back, while a `q` written by someone else is.
 *
 * `SEARCH_DELAY` is 250 ms, so the tests wait it out rather than faking timers.
 */
const TYPED = ["h", "ha", "han", "hana", "hanas", "hanasu", "hanasui"];

function field() {
  return screen.getByPlaceholderText(/Cari produk/) as HTMLInputElement;
}

/** Stands in for the URL: the bar writes it, and something else may reset it. */
function Harness({ onRender }: { onRender?: () => void }) {
  const [q, setQ] = useState("");
  onRender?.();
  return (
    <div>
      <Search value={q} onChange={setQ} />
      <button type="button" onClick={() => setQ("")}>
        reset dari luar
      </button>
    </div>
  );
}

describe("product search", () => {
  test("takes the cursor on mount, without a click", () => {
    render(<Search value="" onChange={() => {}} />);

    expect(document.activeElement).toBe(field());
  });

  test("the query already in the URL is what the bar shows", () => {
    render(<Search value="kopi" onChange={() => {}} />);

    expect(document.activeElement).toBe(field());
    // Focus only: the query already in the URL is what the bar shows.
    expect(field().value).toBe("kopi");
  });

  test("a fast burst keeps every character in the field, and writes it once", async () => {
    const writes: string[] = [];
    function Page() {
      const [q, setQ] = useState("");
      return (
        <Search
          value={q}
          onChange={(next) => {
            // `setQ` is the router in the real page: one write, one page render.
            writes.push(next);
            setQ(next);
          }}
        />
      );
    }
    render(<Page />);

    for (const next of TYPED) fireEvent.change(field(), { target: { value: next } });

    // The scanner's whole code is in the field, at once...
    expect(field().value).toBe("hanasui");
    // ...and nothing has been written to the URL mid-burst.
    expect(writes).toEqual([]);

    // One write, the last word, after the pause.
    await waitFor(() => expect(writes).toEqual(["hanasui"]));
    // The echo comes back as `value="hanasui"` and must not disturb the field.
    expect(field().value).toBe("hanasui");
  });

  test("the page does not re-render while the operator is still typing", async () => {
    let renders = 0;
    render(<Harness onRender={() => (renders += 1)} />);
    expect(renders).toBe(1);

    for (const next of TYPED) fireEvent.change(field(), { target: { value: next } });

    // Seven keystrokes, seven characters on screen, still the first render: only
    // the input re-rendered itself.
    expect(field().value).toBe("hanasui");
    expect(renders).toBe(1);

    // The pause is where the page is allowed to re-render, once.
    await waitFor(() => expect(renders).toBe(2));
  });

  test("a query written from outside the bar lands in the field", async () => {
    const writes: string[] = [];
    function Page() {
      const [q, setQ] = useState("");
      return (
        <div>
          <Search
            value={q}
            onChange={(next) => {
              writes.push(next);
              setQ(next);
            }}
          />
          <button type="button" onClick={() => setQ("")}>
            reset dari luar
          </button>
        </div>
      );
    }
    render(<Page />);

    for (const next of TYPED) fireEvent.change(field(), { target: { value: next } });
    // Settled first: the field and the URL agreeing is the state a reset is
    // pressed in.
    await waitFor(() => expect(writes).toEqual(["hanasui"]));

    // The empty state's reset, a link into the page: cleared from outside.
    fireEvent.click(screen.getByRole("button", { name: "reset dari luar" }));
    await waitFor(() => expect(field().value).toBe(""));
  });

  test("a space typed mid-word survives the round trip", async () => {
    render(<Harness />);

    for (const next of ["kopi", "kopi ", "kopi s", "kopi su"]) {
      fireEvent.change(field(), { target: { value: next } });
    }

    // The stored query is kept as typed — a trimmed one would come back as
    // "kopi" and swallow the space before "susu".
    expect(field().value).toBe("kopi su");
    await waitFor(() => expect(field().value).toBe("kopi su"));
  });
});
