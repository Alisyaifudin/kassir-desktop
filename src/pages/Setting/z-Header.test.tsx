import { describe, expect, mock, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * The session band at the top of Settings.
 *
 * Both hooks are mocked by name rather than the service behind them: `~/services`
 * is mocked by a dozen other test files in this suite, and whichever mount lands
 * last wins process-wide. Depending only on the two hooks keeps this test about the
 * header instead of about module load order.
 *
 * What matters beyond "it renders": the device id is shown — it is how a shop is
 * asked to identify its till when sync misbehaves — and it sits *under* the
 * cashier's name rather than competing with it, because it is a support
 * affordance, not a title.
 */
const DEVICE = "4f1c9e2a-1111-4222-8333-444455556666";

mock.module("~/hooks/use-user", () => ({
  useUser: () => ({ id: "c1", name: "Ani", role: "user" }),
}));

let deviceId: string | null = DEVICE;
mock.module("~/hooks/use-device-id", () => ({
  useDeviceId: () => deviceId,
}));

// `useLogout` is only wired to a click here, so the module is left real.
const { Header } = await import("./z-Header");

describe("Setting header", () => {
  test("shows the device id as the last line of the identity block", async () => {
    deviceId = DEVICE;
    render(<Header />);

    await waitFor(() => expect(screen.getByText(DEVICE)).toBeDefined());

    const line = screen.getByText("ID perangkat").closest("p");
    expect(line).not.toBeNull();
    const block = line!.parentElement;
    expect(block).not.toBeNull();

    // One column: name, then role, then the machine id.
    expect(block!.className).toContain("flex-col");
    expect(block!.children).toHaveLength(3);
    expect(block!.children[block!.children.length - 1]).toBe(line as Element);
    // The first line is still the name, so the id reads as a footnote to it.
    expect(block!.children[0]!.className).toContain("font-semibold");
    expect(block!.children[0]!.textContent).toBe("Ani");
  });

  test("selects the whole id in one click, and keeps it on one line", async () => {
    deviceId = DEVICE;
    render(<Header />);

    const id = await waitFor(() => screen.getByText(DEVICE));
    // A UUID is hard to transcribe from a screenshot if it wraps mid-string;
    // truncation costs nothing because selecting the node copies the full value.
    expect(id.className).toContain("select-all");
    expect(id.className).toContain("font-mono");
    expect(id.className).toContain("truncate");
    expect(id.getAttribute("title")).toBe(DEVICE);
  });

  test("renders no id line before the read lands", async () => {
    // `null` is the in-flight state. An empty "ID perangkat" line would look like
    // a broken install rather than a loading one.
    deviceId = null;
    render(<Header />);

    expect(screen.queryByText("ID perangkat")).toBeNull();
    expect(screen.getByText("Ani")).toBeDefined();
  });
});
