import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { TitleText } from "../eff-Title";
import { render } from "~/lib/render";

describe("TitleText", () => {
  test("renders the store name from useName", async () => {
    render(<TitleText useName={() => "Toko Jaya"} />);
    expect(await screen.findByText("Toko Jaya")).not.toBeNull();
  });

  test("truncates name longer than 16 characters", async () => {
    render(<TitleText useName={() => "Toko Sangat Panjang Sekali"} />);
    const link = await screen.findByTitle("Toko Sangat Panjang Sekali");
    expect(link.textContent!.length).toBeLessThanOrEqual(16);
  });

  test("renders a link to '/'", async () => {
    render(<TitleText useName={() => "MyStore"} />);
    const link = await screen.findByRole("link");
    expect(link.getAttribute("href")).toBe("/");
    expect(link.textContent).toContain("MyStore");
  });
});
