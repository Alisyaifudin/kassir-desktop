import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { showShortcut } from "./use-shortcut";

const linkMap = {
  0: "/pos",
  1: "/restock",
  2: "/products",
  3: "/records",
  4: "/money",
  5: "/setting",
} as Record<string, string>;

/** Alt typing / AltGr / IME belong to the field the operator is in, not to us. */
function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (element === null || typeof element.tagName !== "string") return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable
  );
}

export function useNavigationShortcuts() {
  const navigate = useNavigate();
  const pressed = useRef(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      // A dialog owns the keyboard: `Alt+3` out of "Pembayaran berhasil" would
      // unmount it and take the receipt print and the Batalkan/undo window with
      // it. Same contract the cart's own shortcuts obey.
      if (isScreenOwnedByDialog()) return;
      const link = linkMap[e.key] as string | undefined;
      // Only the combinations we act on are swallowed. Everything else — Alt
      // alone, Alt+Left, AltGr characters, Alt while typing — stays native.
      if (link === undefined) return;
      e.preventDefault();
      showShortcut(false);
      navigate(link);
    }

    function handleAltDown(e: KeyboardEvent) {
      if (e.key !== "Alt" || e.ctrlKey || e.metaKey) return;
      if (isEditableTarget(e.target)) return;
      // The legend would paint behind the dialog's overlay (invisible) while
      // flipping the inert shell's attributes, so leave it alone entirely.
      if (isScreenOwnedByDialog()) return;
      if (pressed.current) return;
      showShortcut((prev) => !prev);
      pressed.current = true;
    }

    function handleAltUp(e: KeyboardEvent) {
      if (e.key === "Alt") pressed.current = false;
    }

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keydown", handleAltDown);
    window.addEventListener("keyup", handleAltUp);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keydown", handleAltDown);
      window.removeEventListener("keyup", handleAltUp);
    };
  }, [navigate]);
}
