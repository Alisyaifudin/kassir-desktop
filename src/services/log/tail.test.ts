import { describe, expect, test } from "bun:test";
import { LOG_VIEW_LIMIT, tailLog } from "./tail";

/**
 * Setting → Log is opened when the app is already misbehaving, so the view must
 * be bounded no matter how long the file has grown — and must not quietly drop
 * lines from what it presents as the log history.
 */
describe("tailLog", () => {
  test("a large file yields only the last lines, newest first", () => {
    const text = Array.from({ length: 50_000 }, (_, i) => `line ${i}`).join("\n");
    const page = tailLog(text);
    expect(page.lines).toHaveLength(LOG_VIEW_LIMIT);
    expect(page.lines[0]).toBe("line 49999");
    expect(page.lines[LOG_VIEW_LIMIT - 1]).toBe(`line ${50_000 - LOG_VIEW_LIMIT}`);
    expect(page.total).toBe(50_000);
  });

  test("keeps warnings: the viewer shows what the file says", () => {
    const page = tailLog("[INFO] mulai\n[WARN] printer belum siap\n[INFO] selesai");
    expect(page.lines).toEqual(["[INFO] selesai", "[WARN] printer belum siap", "[INFO] mulai"]);
    expect(page.total).toBe(3);
  });

  test("an empty file is an empty page, not one blank line", () => {
    expect(tailLog("")).toEqual({ lines: [], total: 0 });
    expect(tailLog("  \n \n")).toEqual({ lines: [], total: 0 });
  });

  test("a short file is shown whole", () => {
    expect(tailLog("a\nb", 10)).toEqual({ lines: ["b", "a"], total: 2 });
  });
});
