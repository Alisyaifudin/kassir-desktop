import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { LoadingPage } from "../z-LoadingPage";
import { render } from "~/lib/render";

describe("LoadingPage", () => {
  test("renders skeleton placeholders", () => {
    const { container } = render(<LoadingPage />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
