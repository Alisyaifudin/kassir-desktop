import { Effect } from "effect";
import { useMutation } from "~/components/Loader";
import { Combobox } from "~/components/ui/combobox";
import { useMemo } from "react";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { LineClassification } from "~/services/report";
import type { Categories } from "./data";

/**
 * One line's category.
 *
 * **Every change writes immediately**, which is the decision that makes `‹ ›`
 * pure navigation: there is no save button, so there is nothing to lose by
 * quitting mid-walk and only one way to lose nothing.
 *
 * What a "change" is, precisely — this is the part that was wrong first and filed
 * `pen`, `peny`, `penye` as categories:
 *
 * `Combobox` reports the field's **raw text on every keystroke** (its `onChange`)
 * and an option's *value* when a row is picked. Only a value is a category, so
 * `onValueChange` ignores anything that is not a known id — a half-typed word is
 * the business of the create row, which fires once when it is used.
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

  /**
   * The options this field offers: the page's list, plus the row *this* cell just
   * created if the list has not caught up.
   *
   * The page re-reads the categories on every write, so the gap is a frame or two
   * — but in that frame `Combobox`'s `labelFor` cannot resolve the new id and falls
   * back to printing it, so the field would blink the raw id and then correct
   * itself. `createThenSet.data` is the row the add returned, so the name is known
   * here without asking anyone.
   */
  const options = useMemo(() => {
    const list = categories.map((item) => ({ value: item.id, label: item.name }));
    const added = createThenSet.data;
    if (added !== null && !categories.some((item) => item.id === added.id)) {
      list.push({ value: added.id, label: added.name });
    }
    return list;
  }, [categories, createThenSet.data]);

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
        options={options}
        placeholder="Pilih"
        emptyText="Belum ada kategori"
        disabled={pending}
        className={cn(
          // Wide enough for a category name (`Penyesuaian`), not just for `Jual`.
          "h-8 w-[152px] text-sm",
          missing && "border-dashed border-amber-500/70 text-amber-700",
          !missing && category.auto && "text-muted-foreground",
          !missing && !category.auto && "font-medium text-foreground",
        )}
        onValueChange={(next) => {
          // Typed text is not a category. Writing it would file every prefix of
          // every search as a category, and the service would refuse each one with
          // "Kategori tidak ditemukan." — which is what the operator saw.
          if (!options.some((item) => item.value === next)) return;
          if (next === category?.categoryId) return;
          void setLine.mutate(next);
        }}
        // The field takes any text: a shop names its own charges, and sending the
        // operator to another screen to mint a category first would break the
        // walk. The row has to read as "add this", not as "create a thing".
        createLabel={(text) => `Tambahkan kategori: ${text}`}
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
