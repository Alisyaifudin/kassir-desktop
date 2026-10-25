import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Cell } from "./z-Cell";

/**
 * Opening a cell's editor selects what is in it.
 *
 * Enter (or a double-click) on a selected cell means "type over this": leaving the
 * caret at the end turned every correction of a price or a quantity into a
 * Backspace session first. The money editor is the interesting one — it parks its
 * own caret at the end while mounting, so this also pins that the selection is the
 * last word on the caret rather than a race won by whichever effect ran last.
 */
function Harness({
  initialEditing,
  ...cell
}: { initialEditing: boolean } & Partial<React.ComponentProps<typeof Cell>>) {
  const [editing, setEditing] = useState(initialEditing);
  return (
    <div>
      <button type="button" onClick={() => setEditing((value) => !value)}>
        toggle
      </button>
      <Cell
        id="cell-test"
        label="Nilai"
        selected
        editing={editing}
        value={10_000}
        display="Rp10.000"
        empty={false}
        placeholder="0"
        onCommit={() => {}}
        onSelect={() => {}}
        onStartEdit={() => setEditing(true)}
        onEditingDone={() => setEditing(false)}
        {...cell}
      />
    </div>
  );
}

/** The editor's selection, as `[start, end]`. */
function selection(input: HTMLInputElement): [number | null, number | null] {
  return [input.selectionStart, input.selectionEnd];
}

function input() {
  return screen.getByRole("textbox") as HTMLInputElement;
}

describe("cell editors open with everything selected", () => {
  test("a money cell selects the whole amount, prefix included", () => {
    render(<Harness initialEditing currency />);

    const field = input();
    expect(field.value).toBe("Rp10.000");
    expect(selection(field)).toEqual([0, "Rp10.000".length]);
  });

  test("a text cell selects its whole value", () => {
    render(
      <Harness
        initialEditing
        value="Kopi Susu"
        display="Kopi Susu"
        empty={false}
        placeholder="Nama"
      />,
    );

    const field = input();
    expect(field.value).toBe("Kopi Susu");
    expect(selection(field)).toEqual([0, "Kopi Susu".length]);
  });

  test("a percent cell selects its number", () => {
    render(
      <Harness
        initialEditing
        percent
        value={12}
        display="12%"
        empty={false}
        placeholder="0"
      />,
    );

    const field = input();
    expect(field.value).toBe("12");
    expect(selection(field)).toEqual([0, 2]);
  });

  test("typing replaces the selection instead of appending to it", () => {
    const commits: string[] = [];
    render(<Harness initialEditing currency onCommit={(raw) => commits.push(raw)} />);

    const field = input();
    // What a keystroke does to an input with everything selected.
    fireEvent.change(field, { target: { value: "5", selectionStart: 1, selectionEnd: 1 } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(commits.at(-1)).toBe("5");
  });

  test("re-entering the editor selects again", () => {
    render(<Harness initialEditing={false} currency />);

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    const field = input();
    expect(selection(field)).toEqual([0, "Rp10.000".length]);
  });
});
