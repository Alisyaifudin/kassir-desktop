/**
 * Clipboard access that survives the app's webview.
 *
 * `navigator.clipboard` is the right API and the one to try first. It is not
 * always there: a Linux build runs the webview on `tauri://localhost`, which is
 * not treated as a secure context everywhere, so `navigator.clipboard` can be
 * missing entirely. Writing therefore falls back to the old `execCommand("copy")`
 * trick — it needs a real selection and a user gesture, and a copy shortcut is
 * both.
 *
 * Reading has no such fallback: `execCommand("paste")` was removed from every
 * engine. `canRead()` lets a caller decide to leave the key alone and let the
 * webview's own `paste` event deliver the text instead.
 */

/** True when the async clipboard can be read; see `canRead`. */
export function canRead(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";
}

/**
 * Put `text` on the clipboard. Answers whether it landed, so a caller can say so
 * rather than showing a toast for something that did not happen.
 */
export async function writeText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Refused (permissions, not focused): fall through to the old way.
  }
  return legacyCopy(text);
}

/**
 * The `execCommand` copy: a hidden textarea holding the text, selected, copied,
 * then removed. It has to be in the document and visible enough to be selectable
 * (a `display: none` node cannot be), hence the zero-size off-screen box.
 */
function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.width = "1px";
  area.style.height = "1px";
  area.style.padding = "0";
  area.style.border = "none";
  area.style.opacity = "0";
  const active = document.activeElement as HTMLElement | null;
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    // The grid keeps the keyboard; a detached textarea taking focus would drop it.
    active?.focus();
  }
}

/** The clipboard's text, or `null` when it cannot be read (see `canRead`). */
export async function readText(): Promise<string | null> {
  if (!canRead()) return null;
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}
