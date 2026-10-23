import { Loader, useStream } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import { Clear } from "./z-Clear";
import { LogErrorBoundary, LogErrorFallback } from "./z-Error";
import { PageHeader } from "../z-PageHeader";
import { Panel } from "../z-Panel";
import { navItemOf } from "../util-nav";

const item = navItemOf("/setting/log");

export default function Page() {
  return (
    <div className="flex h-full w-full flex-col gap-6 px-6 py-6 small:gap-4 small:px-3 small:py-3">
      <PageHeader title={item.label} description={item.description} />
      <Panel
        title="Riwayat Log"
        action={<Clear />}
        className="min-h-0 flex-1"
        bodyClassName="min-h-0 flex-1"
      >
        <LogErrorBoundary fallback={LogErrorFallback}>
          <div className="flex h-full min-h-0 flex-col gap-1 overflow-auto rounded-xl bg-black p-4">
            <Lines />
          </div>
        </LogErrorBoundary>
      </Panel>
    </div>
  );
}

function Lines() {
  const res = useStream(service.logs.lines.changes);
  return (
    <Loader res={res} fallback={<LoadingLines />}>
      {({ data }) => (
        <>
          {/* `text-small` on purpose: this is a console, read line by line and
              scanned for a timestamp, not a sentence anyone reads at arm's length. */}
          <p className="text-small text-muted-foreground select-none">
            {data.total === 0
              ? "Log masih kosong."
              : data.total > data.lines.length
                ? `Menampilkan ${data.lines.length} baris terakhir dari ${data.total} baris.`
                : `Menampilkan ${data.total} baris.`}
          </p>
          {data.lines.map((line, i) => (
            <p
              className={cn(
                "text-small text-white",
                // A warning is part of the history; show it, marked, instead of
                // silently dropping it from what the page calls the log.
                line.includes("[WARN]") && "text-amber-300",
              )}
              key={i}
            >
              {line}
            </p>
          ))}
        </>
      )}
    </Loader>
  );
}

function LoadingLines() {
  return (
    <div className="flex w-full flex-col gap-2 p-2">
      {Array.from({ length: 30 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 animate-pulse rounded bg-white/10"
          style={{ width: `${60 + ((i * 7) % 40)}%` }}
        />
      ))}
    </div>
  );
}
