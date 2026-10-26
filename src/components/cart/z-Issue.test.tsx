import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CodeIssueView, FieldIssue } from "./z-Issue";
import type { CodeIssue } from "./code-issues";

/**
 * The inline problems under a goods cell. An error blocks Bayar and must read as
 * red; a warning is amber. When the issue names the catalogue products involved,
 * each one is a link to its product page — a cashier fixing a duplicate code needs
 * to get there without abandoning the sale.
 */
describe("CodeIssueView", () => {
  test("prints every message", () => {
    const issue: CodeIssue = {
      tone: "warning",
      messages: [{ text: "Kode belum terdaftar" }, { text: "Harga berbeda dari katalog" }],
    };

    render(
      <MemoryRouter>
        <CodeIssueView issue={issue} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Kode belum terdaftar")).toBeDefined();
    expect(screen.getByText("Harga berbeda dari katalog")).toBeDefined();
  });

  test("an error is red, a warning amber", () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <CodeIssueView issue={{ tone: "error", messages: [{ text: "Kode ganda" }] }} />
      </MemoryRouter>,
    );
    expect(container.querySelector(".text-destructive")).not.toBeNull();

    rerender(
      <MemoryRouter>
        <CodeIssueView issue={{ tone: "warning", messages: [{ text: "Kode ganda" }] }} />
      </MemoryRouter>,
    );
    expect(container.querySelector(".text-amber-600")).not.toBeNull();
  });

  test("a named product gets a link to its page", () => {
    render(
      <MemoryRouter>
        <CodeIssueView
          issue={{
            tone: "error",
            messages: [{ text: "Kode sama dengan produk lain", productIds: ["p1", "p2"] }],
          }}
        />
      </MemoryRouter>,
    );

    const links = screen.getAllByTitle("Buka produk");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/products/p1",
      "/products/p2",
    ]);
  });
});

describe("FieldIssue", () => {
  test("is a one-line red message", () => {
    render(<FieldIssue>Jumlah tidak valid</FieldIssue>);
    const line = screen.getByText("Jumlah tidak valid");

    expect(line.tagName).toBe("SPAN");
    expect(line.className).toContain("text-destructive");
  });
});
