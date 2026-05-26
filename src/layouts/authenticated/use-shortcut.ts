import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";

const shortcutAtom = createAtom(false);

export function useShortcut() {
  const v = useAtom(shortcutAtom);
  return v;
}

let timeoutId: null | NodeJS.Timeout = null;
const TIMEOUT = 5000;

export function showShortcut(v: boolean | ((old: boolean) => boolean)) {
  const func = typeof v === "function" ? v : () => v;
  set(func);
}

function set(func: (old: boolean) => boolean) {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  const updated = func(shortcutAtom.get());
  shortcutAtom.set(updated);
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
