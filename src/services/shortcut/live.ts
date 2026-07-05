import { Layer } from "effect";
import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { ShortcutService } from "./index";

const shortcutAtom = createAtom(false);

let timeoutId: ReturnType<typeof setTimeout> | null = null;
const TIMEOUT = 5000;

function clearAutoHide() {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

function scheduleAutoHide() {
  clearAutoHide();
  timeoutId = setTimeout(() => {
    shortcutAtom.set(false);
    timeoutId = null;
  }, TIMEOUT);
}

export const ShortcutServiceLive = Layer.succeed(
  ShortcutService,
  ShortcutService.of({
    useShowShortcut: () => useAtom(shortcutAtom),
    hideShortcut: () => {
      clearAutoHide();
      shortcutAtom.set(false);
    },
    toggleShortcut: () => {
      clearAutoHide();
      const next = !shortcutAtom.get();
      shortcutAtom.set(next);
      if (next) scheduleAutoHide();
    },
  }),
);
