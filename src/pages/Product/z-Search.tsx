import { SearchIcon } from "lucide-react";
import { Input } from "~/components/ui/input";

/**
 * The products search.
 *
 * The bar holds no copy of the query and waits for nothing: the URL is the one
 * source of truth, so what is on screen is what is stored and there is no mirror
 * that can fall out of step with it. Typing used to be mirrored into local state
 * and pushed up after the pause, which is what ate characters — the pause's
 * answer is an *older prefix* of the word being typed, and adopting it back into
 * the field rewound the text mid-word (`hanasui` came out `hansui`).
 *
 * What waits for the pause is the filtering, not the field: it is the part that
 * costs (a catalogue-sized search index and a sort), and it lives in `Rows` in
 * `page.tsx`, one memo away from the paint.
 */
export function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex min-w-[180px] flex-1 items-center">
      <SearchIcon className="absolute left-3 size-6 text-muted-foreground small:size-5" />
      <Input
        type="search"
        // Arriving on this page is almost always "find a product", so the bar
        // takes the cursor on the way in; the alternative is a click before the
        // first keystroke. Same as the Extra page's search.
        autoFocus
        value={value}
        placeholder="Cari produk, listing, atau kode..."
        className="pl-11 pr-12"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  );
}
