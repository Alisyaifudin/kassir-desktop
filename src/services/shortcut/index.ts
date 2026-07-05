import { Context } from "effect";

export class ShortcutService extends Context.Tag("ShortcutService")<
  ShortcutService,
  {
    useShowShortcut(): boolean;
    hideShortcut(): void;
    toggleShortcut(): void;
  }
>() {}
