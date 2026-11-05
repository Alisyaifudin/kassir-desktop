import { TextError } from "~/components/TextError";
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";
import { pageData } from "./data";
import { Item } from "./z-Item";
import { NewBtn } from "./z-NewBtn";

/**
 * The header and the add button are static; the rows are the only thing that
 * waits.
 */
export default function Page() {
  return (
    <pageData.Provider sources={{ categories: service.category.get.changes }}>
      <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Kategori</h1>
          <p className="text-muted-foreground text-base">
            Kelompok produk agar katalog mudah dijelajahi. Satu produk boleh masuk beberapa
            kategori.
          </p>
        </div>

        <List />
        <NewBtn />
      </div>
    </pageData.Provider>
  );
}

function List() {
  return (
    <pageData.Gate
      keys={["categories"]}
      pulse={<LoadingList />}
      error={(error) => (
        <TextError>{`Kategori bermasalah: ${error.message}`}</TextError>
      )}
    >
      {({ categories }) =>
        categories.length === 0 ? (
          // An empty catalogue is a real state on a new shop, not a failure: say
          // what to do instead of showing a blank strip.
          <p className="text-muted-foreground text-base">
            Belum ada kategori. Tambahkan satu untuk mulai mengelompokkan produk.
          </p>
        ) : (
          <div className="flex flex-col gap-2 overflow-auto">
            {categories.map((category) => (
              <Item key={category.id} category={category} />
            ))}
          </div>
        )
      }
    </pageData.Gate>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat kategori">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 w-full">
          <Skeleton className="h-8 flex-1 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}
