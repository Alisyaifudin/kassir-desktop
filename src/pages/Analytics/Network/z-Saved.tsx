import { useState } from "react";
import { Effect, Stream } from "effect";
import { Layers, Trash2, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useQuery } from "~/components/Loader";
import { MODE_NAMES } from "~/lib/constants";
import { formatDate, formatTime } from "~/lib/date";
import {
  deleteProductGraph,
  listProductGraphs,
  openProductGraph,
  ProductGraphError,
  type ProductGraph,
  type ProductGraphSaved,
} from "~/lib/product-graph";
import { formatError } from "~/lib/utils";
import { DAY_MS } from "../use-range";

/**
 * Every network this shop has generated, newest first.
 *
 * The snapshots are derived data, and a build of the same period replaces the
 * previous one — but the older files are the only record of an answer that took
 * seconds to compute, so they are kept and listed rather than thrown away. The
 * list is read from the files themselves (the header inside each one carries
 * the range, the mode, the counts and when it was built), so what it shows is
 * what the app can actually open.
 *
 * Deleting is permanent and therefore armed first: one press asks, the second
 * press removes. Reading the list again after a delete is the only refresh —
 * every row is a file, so the file system is the truth.
 *
 * A row opens what it names: the file is read and decoded here, and the page is
 * handed the graph, so browsing an old answer costs one file read instead of a
 * rebuild.
 */
export function SavedDrawer({
  currentBuiltAt,
  onOpen,
  onClose,
}: {
  /** The snapshot the canvas is showing, so its row can say so. */
  currentBuiltAt: number;
  onOpen: (saved: { file: string; graph: ProductGraph }) => void;
  onClose: () => void;
}) {
  const [version, setVersion] = useState(0);
  const [armed, setArmed] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const res = useQuery(
    () =>
      Stream.fromEffect(
        Effect.tryPromise({
          try: () => listProductGraphs(),
          catch: (cause) => new ProductGraphError(formatError(cause)),
        }),
      ),
    [version],
  );
  const rows = res.type === "success" ? res.data : null;

  const remove = async (file: string) => {
    setDeleting(file);
    setFailure(null);
    try {
      await deleteProductGraph(file);
      setArmed(null);
      setVersion((current) => current + 1);
    } catch (cause) {
      setFailure(formatError(cause));
    } finally {
      setDeleting(null);
    }
  };

  // The drawer is 90% of the canvas, so it has to get out of the way for the
  // graph it just handed over. `opening` is deliberately not cleared on the
  // success path: this component is unmounted a tick later.
  const open = async (file: string) => {
    setOpening(file);
    setFailure(null);
    try {
      const graph = await openProductGraph(file);
      onOpen({ file, graph });
      onClose();
    } catch (cause) {
      setFailure(formatError(cause));
      setOpening(null);
    }
  };

  return (
    <aside
      aria-label="Jaringan tersimpan"
      className="absolute inset-y-0 left-0 z-20 flex w-[90%] flex-col border-r bg-background shadow-lg animate-in duration-200 slide-in-from-left motion-reduce:animate-none"
    >
      <div className="flex flex-none items-start justify-between gap-3 border-b p-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Jaringan tersimpan</h2>
          <p className="text-xs text-muted-foreground">
            Setiap jaringan yang dibuat disimpan di perangkat ini. Pilih satu untuk membukanya;
            menghapus membuangnya permanen.
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Tutup daftar jaringan tersimpan"
          onClick={onClose}
        >
          <X aria-hidden="true" className="size-5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {failure ? (
          <p className="px-3 py-2 text-sm text-destructive" role="alert">
            {failure}
          </p>
        ) : null}
        {res.type === "error" ? (
          <p className="px-3 py-2 text-sm text-destructive" role="alert">
            {res.error.message}
          </p>
        ) : null}
        {rows === null ? (
          <ul className="flex flex-col gap-2 p-3" aria-hidden="true">
            {[0, 1, 2].map((key) => (
              <li key={key}>
                <Skeleton className="h-12 w-full" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Layers aria-hidden="true" className="size-8 text-muted-foreground" />
            <h3 className="text-base font-semibold">Belum ada jaringan tersimpan</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Buat jaringan dari tombol Kendali di toolbar; berkasnya akan muncul di sini.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <SavedRow
                key={row.file}
                row={row}
                current={row.builtAt === currentBuiltAt}
                armed={armed === row.file}
                busy={deleting === row.file || opening === row.file}
                onOpen={() => void open(row.file)}
                onArm={() => setArmed(row.file)}
                onCancel={() => setArmed(null)}
                onDelete={() => void remove(row.file)}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

/**
 * One saved network: what it covers, when it was built, and how much is in it.
 *
 * The range is the half-open span the build was given, so the label subtracts a
 * day to name the last day it covers — the same reading the period bar uses.
 *
 * The text block is the open button and the trash sits beside it: a row that is
 * itself a button cannot hold a second one, and a row with a hover tint would
 * put muted text on a tinted ground.
 */
function SavedRow({
  row,
  current,
  armed,
  busy,
  onOpen,
  onArm,
  onCancel,
  onDelete,
}: {
  row: ProductGraphSaved;
  current: boolean;
  armed: boolean;
  busy: boolean;
  onOpen: () => void;
  onArm: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const range = `${formatDate(row.from)} – ${formatDate(row.to - DAY_MS)}`;
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          disabled={busy}
          aria-busy={busy || undefined}
          className="block w-full rounded-sm px-1 py-1 text-left hover:bg-active/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
        >
          <span className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
            <span className="tabular-nums">{range}</span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <span>{MODE_NAMES[row.mode]}</span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <span className="tabular-nums">
              {row.nodeLimit.toLocaleString("id-ID")} produk teratas
            </span>
            {current ? (
              <span className="rounded-full bg-active/10 px-2 py-0.5 text-xs font-medium text-active">
                Di canvas
              </span>
            ) : null}
          </span>
          <span className="block text-xs tabular-nums text-muted-foreground">
            Dibuat {formatDate(row.builtAt)} {formatTime(row.builtAt)} ·{" "}
            {row.nodes.toLocaleString("id-ID")} produk · {row.edges.toLocaleString("id-ID")}{" "}
            hubungan · {row.records.toLocaleString("id-ID")} transaksi · {formatBytes(row.bytes)}
          </span>
        </button>
        {armed ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
            <span className="text-sm text-destructive">Hapus permanen?</span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={onDelete}
            >
              Hapus
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
              Batal
            </Button>
          </div>
        ) : null}
      </div>
      {armed ? null : (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Hapus jaringan ${range}`}
          disabled={busy}
          onClick={onArm}
        >
          <Trash2 aria-hidden="true" className="size-5" />
        </Button>
      )}
    </li>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString("id-ID")} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}
