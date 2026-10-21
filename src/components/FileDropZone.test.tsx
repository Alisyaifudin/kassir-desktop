import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { FileDropZone } from "./FileDropZone";

/**
 * The import zones used to be a click-only `<div>` over a `hidden` file input:
 * Tab never reached the picker and Enter did nothing, so Setting → Data (product
 * and record) and Money → History could not be operated from the keyboard.
 */
describe("FileDropZone", () => {
  test("the file input is reachable, named, and not hidden from the a11y tree", () => {
    render(<FileDropZone label="Pilih berkas produk" onFiles={() => {}} />);

    const input = screen.getByLabelText("Pilih berkas produk");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("type")).toBe("file");
    expect(input.className).toContain("sr-only");
    expect(input.className).not.toContain("hidden");
  });

  test("choosing a file hands it to the screen", () => {
    const picked: File[] = [];
    render(<FileDropZone label="Pilih berkas produk" onFiles={(files) => picked.push(...files)} />);

    const file = new File(["[]"], "produk.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Pilih berkas produk"), { target: { files: [file] } });

    expect(picked.map((item) => item.name)).toEqual(["produk.json"]);
  });

  test("a dropped file is handed over", () => {
    const picked: File[] = [];
    render(<FileDropZone label="Pilih berkas riwayat" onFiles={(files) => picked.push(...files)} />);

    const file = new File(["[]"], "riwayat.json", { type: "application/json" });
    fireEvent.drop(screen.getByText("Jatuhkan berkas di sini atau klik"), {
      dataTransfer: { files: [file] },
    });

    expect(picked.map((item) => item.name)).toEqual(["riwayat.json"]);
  });
});
