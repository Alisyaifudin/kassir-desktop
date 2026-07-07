import { describe, test, expect } from "bun:test";
import { Loading } from "../z-Loading";
import { render } from "~/lib/render";

describe("Loading", () => {
  test("renders skeleton rows in table body", () => {
    const { container } = render(<Loading />);
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
