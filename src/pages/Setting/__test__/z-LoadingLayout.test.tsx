import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { LoadingLayout } from "../z-LoadingLayout";
import { render } from "~/lib/render";

describe("LoadingLayout", () => {
  test("renders skeleton placeholders", () => {
    const { container } = render(<LoadingLayout />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
