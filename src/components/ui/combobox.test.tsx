import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { Combobox, type ComboboxOption } from "./combobox";

/**
 * The create row: the half of "select that also accepts free text" that turns a
 * typed word into a value the list does not hold.
 *
 * The product's category picker is the caller that needs it — a name the shop has
 * not used before is ordinary there — and the rules it lands on are easy to get
 * subtly wrong, so they are pinned here rather than through the form:
 *
 *  - a name the list already holds is a pick, never a create (a second row would
 *    be the duplicate the category table refuses);
 *  - the caller can veto a name, which is how an "adder" hides a category that is
 *    already a badge above it (its options only ever list what is *not* picked);
 *  - Enter uses the create row, because a typed name is an answer and not a form
 *    submission — but an arrow key still arms a real option, which wins.
 */
const options: ComboboxOption[] = [
  { value: "c-minuman", label: "Minuman" },
  { value: "c-sabun", label: "Sabun" },
];

/** An adder rig: the field holds no value, so picks are only reported. */
function renderAdder({
  onCreate,
  createLabel = (text: string) => `Tambahkan "${text}"`,
}: {
  onCreate: (text: string) => void;
  createLabel?: (text: string) => string | null;
}) {
  const picked: string[] = [];
  render(
    <Combobox
      value=""
      onValueChange={(value) => picked.push(value)}
      options={options}
      adder
      aria-label="Tambah kategori"
      createLabel={createLabel}
      onCreate={onCreate}
    />,
  );
  return { picked };
}

function type(text: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Tambah kategori" }), {
    target: { value: text },
  });
}

describe("the create row", () => {
  test("an unknown name is offered, quoted, and hands back what was typed", () => {
    const created: string[] = [];
    renderAdder({ onCreate: (text) => created.push(text) });

    type("Teh");

    const row = screen.getByRole("button", { name: 'Tambahkan "Teh"' });
    fireEvent.click(row);

    expect(created).toEqual(["Teh"]);
  });

  test("a name the list already holds is a pick, so no row offers to create it", () => {
    renderAdder({ onCreate: () => {} });

    type("Minuman");

    expect(screen.queryByRole("button", { name: /Tambahkan/ })).toBeNull();
  });

  test("the case of the typed name does not make it a new category", () => {
    renderAdder({ onCreate: () => {} });

    type("minuman");

    expect(screen.queryByRole("button", { name: /Tambahkan/ })).toBeNull();
  });

  test("a caller can veto a name it knows is already on the record", () => {
    renderAdder({ onCreate: () => {}, createLabel: () => null });

    type("Teh");

    expect(screen.queryByRole("button", { name: /Tambahkan/ })).toBeNull();
  });

  test("nothing typed means nothing to create", () => {
    renderAdder({ onCreate: () => {} });

    type("   ");

    expect(screen.queryByRole("button", { name: /Tambahkan/ })).toBeNull();
  });
});

describe("Enter in an adder field", () => {
  test("uses the create row — a typed name is an answer, not a form submission", () => {
    const created: string[] = [];
    renderAdder({ onCreate: (text) => created.push(text) });

    type("Teh");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Tambah kategori" }), {
      key: "Enter",
    });

    expect(created).toEqual(["Teh"]);
  });

  test("a row armed with the arrow keys wins over the create row", () => {
    const created: string[] = [];
    const { picked } = renderAdder({ onCreate: (text) => created.push(text) });
    const field = screen.getByRole("combobox", { name: "Tambah kategori" });

    // `Sab` matches one option, so a create row is offered as well; arrowing down
    // must pick from the list rather than create a second `Sab`. Which row is
    // armed is not the point — the list narrows on the settled text, so this
    // asserts the rule, not the row.
    type("Sab");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(picked).toHaveLength(1);
    expect(created).toEqual([]);
  });
});
