import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ForEach } from "./ForEach";

/** The array-map helper: nothing for an empty list, and the index is passed on. */
describe("ForEach", () => {
  test("an empty list renders nothing", () => {
    const { container } = render(<ForEach items={[]}>{() => <span>baris</span>}</ForEach>);
    expect(container.textContent).toBe("");
  });

  test("each item gets its index", () => {
    render(
      <ForEach items={["a", "b"]}>
        {(item, index) => <span key={item}>{`${index}:${item}`}</span>}
      </ForEach>,
    );

    expect(screen.getByText("0:a")).toBeDefined();
    expect(screen.getByText("1:b")).toBeDefined();
  });

  test("the caller's key function is used when given", () => {
    const asked: string[] = [];
    render(
      <ForEach
        items={[{ id: "p1" }, { id: "p2" }]}
        extractKey={(item) => {
          asked.push(item.id);
          return item.id;
        }}
      >
        {(item) => <span>{item.id}</span>}
      </ForEach>,
    );

    expect(screen.getByText("p1")).toBeDefined();
    expect(screen.getByText("p2")).toBeDefined();
    expect(asked).toEqual(["p1", "p2"]);
  });
});
