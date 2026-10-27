import { Show } from "~/components/Show";
import { TextError } from "~/components/TextError";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import { pageData } from "./data";
import { Item } from "./z-Item";
import { NewItem } from "./z-NewItem";

/** Head, column labels and the add button are static; the rows are the key. */
export default function Page() {
  return (
    <pageData.Provider sources={{ socials: service.social.get.changes }}>
      <div className="flex flex-col gap-4 p-6 w-full flex-1 overflow-hidden">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Kontak Media Sosial</h1>
          <p className="text-muted-foreground text-base">
            Kelola kontak yang muncul di struk transaksi
          </p>
        </div>

        <div
          className={cn(
            "grid gap-2 items-center text-base",
            "grid-cols-[250px_1fr]",
          )}
        >
          <p className="font-semibold text-foreground">Kontak</p>
          <p className="font-semibold text-foreground">Isian</p>
        </div>

        <Socials />

        <NewItem />
      </div>
    </pageData.Provider>
  );
}

function Socials() {
  return (
    <pageData.Gate
      keys={["socials"]}
      pulse={<LoadingList />}
      error={(error) => <TextError>{`Kontak bermasalah: ${error.message}`}</TextError>}
    >
      {({ socials }) => (
        <Show
          when={socials.length > 0}
          fallback={<p className="text-2xl">---Belum Ada---</p>}
        >
          <div className="flex flex-col gap-1 overflow-y-auto">
            {socials.map((social) => (
              <Item key={social.id} id={social.id} name={social.name} value={social.value} />
            ))}
          </div>
        </Show>
      )}
    </pageData.Gate>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-1 overflow-y-auto" aria-busy="true" aria-label="Memuat kontak">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "grid gap-2 items-center text-base",
            "grid-cols-[250px_1fr]",
          )}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
