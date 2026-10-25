import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Search } from "./z-Search";

/**
 * The product search: cursor on arrival, and every character the operator types.
 *
 * The bar takes the cursor as the page appears — arriving on `/products` is almost
 * always "find a product", and without it the first keystroke of every visit went
 * nowhere. The Extra page's search has behaved this way for longer; this pins the
 * pair so neither can drift.
 *
 * The characters are the important half. The field used to keep its own copy of
 * the query and push it up after a pause, so the pause's answer — an older prefix
 * of the same word — came back into the field mid-word: typing `hanasui` quickly
 * produced `hansui`, because `hana` landed back in the bar and the last `a` was
 * gone. The field now holds nothing of its own; what the operator typed is the
 * stored query, keystroke for keystroke.
 */
describe("product search", () => {
  test("takes the cursor on mount, without a click", () => {
    render(<Search value="" onChange={() => {}} />);

    expect(document.activeElement).toBe(screen.getByPlaceholderText(/Cari produk/));
  });

  test("the cursor lands after navigation even with a query already in the URL", () => {
    render(<Search value="kopi" onChange={() => {}} />);

    const field = screen.getByPlaceholderText(/Cari produk/) as HTMLInputElement;
    expect(document.activeElement).toBe(field);
    // Focus only: the query already in the URL is what the bar shows.
    expect(field.value).toBe("kopi");
  });

  test("a fast burst keeps every character and reaches the caller at once", () => {
    const changes: string[] = [];
    function Harness() {
      const [value, setValue] = useState("");
      return (
        <Search
          value={value}
          onChange={(next) => {
            changes.push(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Harness />);
    const field = screen.getByPlaceholderText(/Cari produk/) as HTMLInputElement;

    // The operator's word, one keystroke at a time, faster than any pause.
    for (const next of ["h", "ha", "han", "hana", "hanas", "hanasu", "hanasui"]) {
      fireEvent.change(field, { target: { value: next } });
    }

    expect(field.value).toBe("hanasui");
    // Nothing was held back and nothing was echoed back over it.
    expect(changes).toEqual(["h", "ha", "han", "hana", "hanas", "hanasu", "hanasui"]);
  });

  test("a space typed mid-word survives the round trip", () => {
    function Harness() {
      const [value, setValue] = useState("");
      return <Search value={value} onChange={setValue} />;
    }
    render(<Harness />);
    const field = screen.getByPlaceholderText(/Cari produk/) as HTMLInputElement;

    for (const next of ["kopi", "kopi ", "kopi s", "kopi su"]) {
      fireEvent.change(field, { target: { value: next } });
    }

    // The stored query is kept as typed — a trimmed one would come back as
    // "kopi" and swallow the space before "susu".
    expect(field.value).toBe("kopi su");
  });
});
