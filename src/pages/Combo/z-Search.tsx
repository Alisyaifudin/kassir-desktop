import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kdb";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { SEARCH_DELAY } from "~/lib/constants";

export function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value);
  const field = useRef<HTMLInputElement>(null);
  const handled = useRef(value);
  const push = useDebouncedCallback((next: string) => {
    handled.current = next;
    onChange(next);
  }, SEARCH_DELAY);

  useEffect(() => {
    if (value === handled.current) return;
    push.cancel();
    handled.current = value;
    setText(value);
  }, [value, push]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "F1" || isScreenOwnedByDialog()) return;
      event.preventDefault();
      const input = field.current;
      if (input === null) return;
      input.focus();
      input.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative flex min-w-[180px] flex-1 items-center">
      <Kbd className="absolute left-2 size-6 text-muted-foreground">F1</Kbd>
      <SearchIcon className="absolute right-2 size-6 text-muted-foreground" />
      <Input
        ref={field}
        type="search"
        autoFocus
        aria-keyshortcuts="F1"
        value={text}
        placeholder="Cari kombo, listing, atau biaya/potongan..."
        className="pl-10 pr-11"
        onChange={(event) => {
          const next = event.currentTarget.value;
          setText(next);
          push(next);
        }}
      />
    </div>
  );
}
