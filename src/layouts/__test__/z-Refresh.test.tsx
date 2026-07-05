import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { render as renderRaw } from "@testing-library/react";
import { Refresh } from "../z-Refresh";

describe("Refresh", () => {
  test("renders a refresh button with an icon", async () => {
    renderRaw(<Refresh />, { wrapper: MemoryRouter });
    const btn = await screen.findByRole("button");
    expect(btn.querySelector("svg")).not.toBeNull();
  });
});
