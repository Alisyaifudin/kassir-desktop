import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Show } from "./Show";

/**
 * Conditional render, in two shapes. The rule every call site relies on is that
 * `value` treats only `null`/`undefined` as missing: `0` is a real count and `""`
 * a real string, so neither may collapse into the fallback.
 */
describe("Show", () => {
  test("when=false renders the fallback; when=true renders the children", () => {
    const { rerender } = render(
      <Show when={false} fallback={<span>kosong</span>}>
        <span>isi</span>
      </Show>,
    );
    expect(screen.getByText("kosong")).toBeDefined();

    rerender(
      <Show when={true} fallback={<span>kosong</span>}>
        <span>isi</span>
      </Show>,
    );
    expect(screen.getByText("isi")).toBeDefined();
  });

  test("a null or undefined value renders the fallback", () => {
    render(
      <Show value={null} fallback={<span>kosong</span>}>
        {(value: string) => <span>{value}</span>}
      </Show>,
    );
    render(
      <Show value={undefined} fallback={<span>kosong</span>}>
        {(value: string) => <span>{value}</span>}
      </Show>,
    );

    expect(screen.getAllByText("kosong")).toHaveLength(2);
  });

  test("a present falsy value is a value, not a fallback", () => {
    render(
      <Show value={0} fallback={<span>kosong</span>}>
        {(value: number) => <span>jumlah {value}</span>}
      </Show>,
    );
    render(
      <Show value="" fallback={<span>kosong</span>}>
        {(value: string) => <span>teks [{value}]</span>}
      </Show>,
    );

    expect(screen.getByText("jumlah 0")).toBeDefined();
    expect(screen.getByText("teks []")).toBeDefined();
  });
});
