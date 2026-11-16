import { Effect } from "effect";
import { useMutation } from "~/components/Loader";
import { Combobox } from "~/components/ui/combobox";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { LineClassification } from "~/services/report";
import type { Categories } from "./data";

/**
 * One line's category.
 *
 * **Every change writes immediately**, which is the decision that makes `‹ ›`
 * pure navigation: there is no save button, so there is nothing to lose by
 * quitting mid-walk and only one way to lose nothing. `Combobox` calls
 * `onValueChange` when an option is picked or the field is blurred — not per
 * keystroke — so the write lands once per decision.
 *
 * A category the list does not hold yet is typed straight into the field
 * (`onCreate`) and written to `report_categories` in the same action, so the
 * classifier never sends the operator to another screen mid-day.
 *
 * Three visual states, and the difference is the point of the screen:
 *
 *  - **missing** (`—`, dashed, amber): no category at all. This is what blocks
 *    the day, so it has to be the thing the eye finds.
 *  - **guess** (`auto`): filled in by the mode default or a remembered name. Muted:
 *    read it, do not trust it.
 *  - **chosen**: solid. The operator said so.
 */
export function KategoriCell({
  recordId,
  source,
  lineId,
  category,
  categories,
}: {
  recordId: string;
  source: "listing" | "extra";
  /** `record_listing_group_id` or `record_extra_id`. */
  lineId: string;
  category: LineClassification | undefined;
  categories: Categories;
}) {
  const setLine = useMutation((categoryId: string) =>
    service.report.set.line({ recordId, source, lineId, categoryId }),
  );
  const createThenSet = useMutation((name: string) =>
    Effect.gen(function* () {
      const added = yield* service.report.add.category(name);
      yield* service.report.set.line({
        recordId,
        source,
        lineId,
        categoryId: added.id,
      });
      return added;
    }),
  );

  const missing = category === undefined;
  const pending = setLine.pending || createThenSet.pending;
  const error = setLine.error ?? createThenSet.error;

  return (
    // The state is data, not just a class: it is what the tests assert and what an
    // e2e run can select on ("how many lines are still missing?"), and Tailwind's
    // class soup is neither readable nor stable enough to answer either question.
    <div
      className="flex flex-col items-end gap-0.5"
      data-classification={missing ? "missing" : category.auto ? "guess" : "chosen"}
    >
      <Combobox
        aria-label="Kategori"
        value={category?.categoryId ?? ""}
        options={categories.map((item) => ({ value: item.id, label: item.name }))}
        placeholder="Pilih"
        emptyText="Belum ada kategori"
        disabled={pending}
        className={cn(
          "h-8 w-[132px] text-sm",
          missing && "border-dashed border-amber-500/70 text-amber-700",
          !missing && category.auto && "text-muted-foreground",
          !missing && !category.auto && "font-medium text-foreground",
        )}
        onValueChange={(next) => {
          // Blur reports what the field already held; writing that again would be
          // a no-op query per line the operator merely tabbed past.
          if (next === "" || next === category?.categoryId) return;
          void setLine.mutate(next);
        }}
        createLabel={(text) => `Buat kategori “${text}”`}
        onCreate={(text) => void createThenSet.mutate(text)}
      />
      {error === null ? null : (
        <p className="text-[11px] text-destructive" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
