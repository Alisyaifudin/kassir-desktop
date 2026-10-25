import { TextError } from "~/components/TextError";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import { PageHeader } from "../z-PageHeader";
import { Panel } from "../z-Panel";
import { navItemOf } from "../util-nav";
import { pageData } from "./data";
import { Clear } from "./z-Clear";

const item = navItemOf("/setting/log");

export default function Page() {
  return (
    <pageData.Provider sources={{ lines: service.logs.lines.changes }}>
      <div className="flex h-full w-full flex-col gap-6 px-6 py-6 small:gap-4 small:px-3 small:py-3">
        <PageHeader title={item.label} description={item.description} />
        <Panel
          title="Riwayat Log"
          action={<Clear />}
          className="min-h-0 flex-1"
          bodyClassName="min-h-0 flex-1"
        >
          <Console />
        </Panel>
      </div>
    </pageData.Provider>
  );
}

/**
 * The black console is chrome — it is drawn, at its final size, before a single
 * line has been read. Only the lines inside it wait, which is also why the clear
 * button in the panel head is usable from the first frame.
 */
function Console() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-auto rounded-xl bg-black p-4">
      <pageData.Gate
        keys={["lines"]}
        pulse={<LoadingLines />}
        error={(error) => <TextError>{error.message}</TextError>}
      >
        {({ lines }) => (
          <>
            {/* `text-small` on purpose: this is a console, read line by line and
                scanned for a timestamp, not a sentence anyone reads at arm's length. */}
            <p className="text-small text-muted-foreground select-none">{linesNote(lines)}</p>
            {lines.lines.map((line, i) => (
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
      </pageData.Gate>
    </div>
  );
}

/** How much of the log is on screen, in one sentence. */
function linesNote(lines: { total: number; lines: string[] }): string {
  if (lines.total === 0) return "Log masih kosong.";
  if (lines.total > lines.lines.length) {
    return `Menampilkan ${lines.lines.length} baris terakhir dari ${lines.total} baris.`;
  }
  return `Menampilkan ${lines.total} baris.`;
}

function LoadingLines() {
  return (
    <div className="flex w-full flex-col gap-2 p-2" aria-busy="true" aria-label="Memuat log">
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
