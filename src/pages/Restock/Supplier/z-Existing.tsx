import { Input } from "~/components/ui/input";
import { SUPPLIERS } from "../mock";

/**
 * Find a supplier by name. A restocker knows who they bought from, not an id,
 * so this is a plain name filter over a short list rather than a fuzzy index —
 * there are as many suppliers as there are stalls they visit.
 */
export function Existing() {
  return (
    <div className="flex min-h-0 w-full flex-col gap-2">
      <Input type="search" placeholder="Cari pemasok..." defaultValue="" />
      <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto scroll-gutter">
        {SUPPLIERS.map((supplier, i) => (
          <li key={supplier.id}>
            <button
              type="button"
              className={`flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                i === 0 ? "bg-active text-active-foreground shadow-md" : "hover:bg-accent"
              }`}
            >
              <span className="text-small font-medium leading-tight">{supplier.name}</span>
              <span className="text-small leading-tight text-muted-foreground">
                {supplier.note || "tanpa catatan"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
