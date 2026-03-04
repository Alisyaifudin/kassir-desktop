import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";

const shortcutAtom = createAtom(false);

export function useShortcut() {
  const v = useAtom(shortcutAtom);
  return v;
}

let timeoutId: null | NodeJS.Timeout = null;
const TIMEOUT = 4000;

export function showShortcut(v: boolean | ((old: boolean) => boolean)) {
  if (typeof v === "function") {
    shortcutAtom.set(v);
    return;
  }
  set(() => v);
}

function set(func: (old: boolean) => boolean) {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  const updated = func(shortcutAtom.get());
  if (updated) {
    timeoutId = setTimeout(() => {
      shortcutAtom.set(false);
      timeoutId = null;
    }, TIMEOUT);
    return true;
  } else {
    return false;
  }
}
