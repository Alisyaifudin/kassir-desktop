import { Context } from "effect";

export class ShortcutService extends Context.Tag("ShortcutService")<
  ShortcutService,
  {
    useShowShortcut(): boolean;
    useNavigationShortcuts(): void;
    hideShortcut(): void;
    toggleShortcut(): void;
  }
>() {}
