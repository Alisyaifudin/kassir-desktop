import { Item } from "./z-Item";
import { cn } from "~/lib/utils";
import { NewItem } from "./z-NewItem";
import { Loader, useStream } from "~/components/Loader";
import { service } from "~/services";
import { Skeleton } from "~/components/ui/skeleton";
import { SocialErrorBoundary, SocialErrorFallback } from "./z-Error";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 w-full flex-1 overflow-hidden">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Kontak Media Sosial</h1>
        <p className="text-muted-foreground text-normal">
          Kelola kontak yang muncul di struk transaksi
        </p>
      </div>

      <div
        className={cn(
          "grid gap-2 items-center text-normal",
          "grid-cols-[250px_1fr] small:grid-cols-[200px_1fr]",
        )}
      >
        <p className="font-semibold text-foreground">Kontak</p>
        <p className="font-semibold text-foreground">Isian</p>
      </div>

      <Socials />

      <NewItem />
    </div>
  );
}

function Socials() {
  const res = useStream(service.social.get.changes);
  return (
    <SocialErrorBoundary fallback={SocialErrorFallback}>
      <Loader res={res} fallback={<LoadingList />}>
        {({ data: socials }) => {
          if (socials.length === 0) return <p className="text-big">---Belum Ada---</p>;
          return (
            <div className="flex flex-col gap-1 overflow-y-auto">
              {socials.map((social) => (
                <Item key={social.id} id={social.id} name={social.name} value={social.value} />
              ))}
            </div>
          );
        }}
      </Loader>
    </SocialErrorBoundary>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "grid gap-2 items-center text-normal",
            "grid-cols-[250px_1fr] small:grid-cols-[200px_1fr]",
          )}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
