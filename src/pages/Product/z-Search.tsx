import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kdb";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { SEARCH_DELAY } from "~/lib/constants";

/**
 * The products search: the field paints, the page waits for the pause.
 *
 * The bar holds the text in its own state, so a keystroke re-renders this input
 * and nothing else — the URL is written once, `SEARCH_DELAY` after the last key.
 * That is the same shape as the Extra and Record bars, and it is what a barcode
 * scanner needs: a wedge types the whole code in a few dozen milliseconds, and
 * a bar wired straight to the router (a navigation, and so a page render, per
 * character) lost the tail of it — the field was rendered back down to a query
 * the router had not caught up with yet, and every character typed in the
 * meantime went with it. Backspace felt just as bad, one page render per
 * deletion.
 *
 * The one hazard of a local copy is the old "hanasui → hansui": adopt the
 * debounced answer back into the field and it arrives as an *older prefix* of
 * the word still being typed. So this bar adopts a `q` only when it did not send
 * it — `handled` is the last query it wrote, and everything equal to that is its
 * own echo — which still lets the outside writers land: the empty state's reset,
 * and arriving with a `q` already in the URL.
 */
export function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value);
  const field = useRef<HTMLInputElement>(null);
  // The query this bar last handed to the URL; anything equal to it is our echo.
  const handled = useRef(value);
  const push = useDebouncedCallback((next: string) => {
    handled.current = next;
    onChange(next);
  }, SEARCH_DELAY);

  useEffect(() => {
    // Our own echo, or nothing to adopt.
    if (value === handled.current) return;
    // Someone else wrote the query: stop the half-typed one from overwriting it.
    push.cancel();
    handled.current = value;
    setText(value);
  }, [value, push]);

  // F1 is the key the field advertises, so `window` hands it back to the field
  // from anywhere on the page — the filter and sort popovers included. What is
  // there is *selected*, not just focused: F1 is pressed to type a new query, and
  // appending to the last one is never what was meant. A dialog owns the
  // keyboard while it is open (the delete confirmation), so the shortcut waits.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "F1" || isScreenOwnedByDialog()) return;
      // F1 is the browser's help key; the page has a better use for it.
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
        // Arriving on this page is almost always "find a product", so the bar
        // takes the cursor on the way in; the alternative is a click before the
        // first keystroke. Same as the Extra page's search.
        autoFocus
        // The visual hint is the `Kbd` above; this is the same promise to a
        // screen reader, and it is what the F1 listener honours.
        aria-keyshortcuts="F1"
        value={text}
        placeholder="Cari produk, listing, atau kode..."
        className="pl-10 pr-11"
        onChange={(event) => {
          const next = event.currentTarget.value;
          // Only this component re-renders here; the page hears about it once,
          // after the pause.
          setText(next);
          push(next);
        }}
      />
    </div>
  );
}
