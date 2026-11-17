import { useMutation } from "~/components/Loader";
import { TextError } from "~/components/TextError";
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";
import type { ReportCategory } from "~/services/report";
import { pageData, sources } from "./data";
import { Item } from "./z-Item";
import { NewBtn } from "./z-NewBtn";

/**
 * The report's categories: what a line can *mean*.
 *
 * The six built-ins are the vocabulary the report itself reads — a sale's goods
 * default to `jual`, a purchase's to `beli`, and `abaikan` is what keeps a
 * pass-through charge out of the figures — so they can be renamed and reordered
 * but not deleted. Everything the shop adds is fully its own.
 *
 * Order is the operator's, not alphabetical: the report prints the categories in
 * this order, so this is the order a reader of the paper meets them in.
 */
export default function Page() {
  return (
    <pageData.Provider sources={sources}>
      {/* `main`, like `/report`: a route page is a landmark, and the topbar's route
          title is the same words as this heading — scoping to `main` is how anything
          (a test, a screen reader's landmark list) tells them apart. */}
      <main className="flex flex-1 flex-col gap-4 overflow-auto p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Kategori Laporan</h1>
          <p className="text-base text-muted-foreground">
            Arti tiap baris di laporan keuangan. Urutannya menentukan urutan di PDF.
          </p>
        </div>

        <List />
        <NewBtn />
      </main>
    </pageData.Provider>
  );
}

function List() {
  return (
    <pageData.Gate
      keys={["categories"]}
      pulse={<LoadingList />}
      error={(error) => <TextError>{`Kategori bermasalah: ${error.message}`}</TextError>}
    >
      {({ categories }) => <Rows categories={categories} />}
    </pageData.Gate>
  );
}

function Rows({ categories }: { categories: ReportCategory[] }) {
  const reorder = useMutation(service.report.set.categoryOrder);

  /**
   * Move one row up or down.
   *
   * The whole order is sent, not a pair of swaps: the service assigns `0..n-1` from
   * the list it is given, so there is no such thing as a half-applied swap.
   */
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((category) => category.id);
    const moved = ids[index];
    const replaced = ids[target];
    if (moved === undefined || replaced === undefined) return;
    ids[index] = replaced;
    ids[target] = moved;
    void reorder.mutate(ids);
  }

  return (
    <div className="flex flex-col gap-2">
      {categories.length === 0 ? (
        <p className="text-base text-muted-foreground">
          Belum ada kategori. Tambahkan satu untuk mulai mengartikan baris.
        </p>
      ) : (
        categories.map((category, index) => (
          <Item
            key={category.id}
            category={category}
            first={index === 0}
            last={index === categories.length - 1}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
            busy={reorder.pending}
          />
        ))
      )}
      <TextError>{reorder.error?.message}</TextError>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat kategori">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex w-full items-center gap-3">
          <Skeleton className="h-8 flex-1 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}
