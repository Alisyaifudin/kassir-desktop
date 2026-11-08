import { useMemo, useState } from "react";
import { Network, RefreshCw } from "lucide-react";
import { readSnapshot, buildSnapshot, pageData } from "./data";
import { NetworkCanvas } from "./z-Canvas";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Slider } from "~/components/ui/slider";
import { Skeleton } from "~/components/ui/skeleton";
import { MODE_NAMES } from "~/lib/constants";
import { formatDate, formatTime } from "~/lib/date";
import { cn } from "~/lib/utils";
import type {
  ProductGraph,
  ProductGraphMetric,
  ProductGraphMode,
  ProductGraphProgress,
  ProductGraphStatus,
} from "~/lib/product-graph";
import { ProductGraphError } from "~/lib/product-graph";
import { DAY_MS, useRange } from "../use-range";

/** A file opened from the saved list: the graph it holds and the row it came from. */
type OpenedSnapshot = { file: string; graph: ProductGraph };

const DEFAULT_NODE_LIMIT = 300;
const MIN_NODE_LIMIT = 100;
const MAX_NODE_LIMIT = 600;

export default function Page() {
  const { from, to } = useRange();
  const [mode, setMode] = useState<ProductGraphMode>("incoming");
  const [nodeLimit, setNodeLimit] = useState(DEFAULT_NODE_LIMIT);
  const sources = useMemo(
    () => ({ snapshot: readSnapshot(from, to, mode, nodeLimit) }),
    [from, to, mode, nodeLimit],
  );

  return (
    <pageData.Provider sources={sources} deps={[from, to, mode, nodeLimit]}>
      <Workspace
        from={from}
        to={to}
        mode={mode}
        onMode={setMode}
        nodeLimit={nodeLimit}
        onNodeLimit={setNodeLimit}
      />
    </pageData.Provider>
  );
}

function Workspace({
  from,
  to,
  mode,
  onMode,
  nodeLimit,
  onNodeLimit,
}: {
  from: number;
  to: number;
  mode: ProductGraphMode;
  onMode: (mode: ProductGraphMode) => void;
  nodeLimit: number;
  onNodeLimit: (limit: number) => void;
}) {
  const [metric, setMetric] = useState<ProductGraphMetric>("count");
  const [neighborLimit, setNeighborLimit] = useState(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProductGraphProgress | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [opened, setOpened] = useState<OpenedSnapshot | null>(null);
  const frame = pageData.useFrame(["snapshot"]);
  const refresh = pageData.useRefresh();
  const build = pageData.useMutation<void, ProductGraphStatus, ProductGraphError>(
    () => buildSnapshot(from, to, mode, nodeLimit, setProgress),
    { refetch: ["snapshot"] },
  );
  const snapshotState = pageData.use("snapshot");
  const snapshot = snapshotState.type === "success" ? snapshotState.data : null;
  // The canvas shows the period's snapshot or the file that was opened — and
  // the selection is an index into whichever one is drawn, so both go through
  // `shown` rather than through the page's data.
  const shown = opened?.graph ?? snapshot?.graph ?? null;
  const selectedIndex = shown?.nodes.findIndex((node) => node.id === selectedId) ?? -1;
  const selected = selectedIndex >= 0 ? selectedIndex : null;
  const onSelect = (index: number | null) => {
    setSelectedId(index === null ? null : (shown?.nodes[index]?.id ?? null));
  };

  const buildAgain = async () => {
    // The dialog is a settings sheet, not a console: the progress card floats
    // over the canvas, so the sheet gets out of the way the moment a build
    // starts — and the card goes away with the build. A rebuild is about the
    // period, so it also leaves any saved file that was open.
    setControlsOpen(false);
    setOpened(null);
    setProgress({ stage: "prepare", percent: 0, done: 0, total: 1 });
    await build.mutate(undefined);
    setProgress(null);
  };

  // The controls are behind the FAB now, so what the network is built from has
  // to stay readable without opening it.
  const summary = [
    MODE_NAMES[mode],
    metric === "count" ? "Jumlah bersama" : "Di atas peluang",
    `${neighborLimit} pasangan`,
    `${nodeLimit} produk`,
  ].join(" · ");

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex flex-none flex-col gap-2 border-b p-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-base font-semibold">Jaringan produk</h1>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
        {build.error ? (
          <p className="text-sm text-destructive" role="alert">
            {build.error.message}
          </p>
        ) : null}
        {frame.error ? (
          <div
            className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 px-3 py-2"
            role="alert"
          >
            <p className="text-sm text-destructive">{frame.error.message}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => refresh("snapshot")}>
              Coba lagi
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={controlsOpen} onOpenChange={setControlsOpen}>
        {/* Above the fullscreen canvas (z-60): the sheet has to be usable from
            inside it, scrim included. */}
        <DialogContent className="z-[70] max-w-md" overlayClassName="z-[70]">
          <DialogHeader>
            <DialogTitle>Kendali jaringan</DialogTitle>
            <DialogDescription>
              Jenis transaksi, ketebalan garis, dan berapa banyak produk yang dibaca.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Segmented
              label="Jenis transaksi"
              value={mode}
              options={[
                { key: "incoming", label: MODE_NAMES.incoming },
                { key: "outcoming", label: MODE_NAMES.outcoming },
              ]}
              onChange={onMode}
            />
            <Segmented
              label="Ketebalan garis"
              value={metric}
              options={[
                { key: "count", label: "Jumlah bersama" },
                { key: "lift", label: "Di atas peluang" },
              ]}
              onChange={setMetric}
            />
            <SliderControl
              label="Pasangan per produk"
              value={neighborLimit}
              min={2}
              max={10}
              step={1}
              onChange={setNeighborLimit}
            />
            <SliderControl
              label="Batas produk teratas"
              value={nodeLimit}
              min={MIN_NODE_LIMIT}
              max={MAX_NODE_LIMIT}
              step={50}
              onChange={onNodeLimit}
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void buildAgain()} disabled={build.pending}>
              <RefreshCw
                aria-hidden="true"
                className={cn("size-5", build.pending && "animate-spin")}
              />
              Buat ulang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative min-h-0 flex-1 pt-2">
        {/* Centered on the canvas rather than in the header: a build is a fact
            about the picture, it lasts seconds, and nothing else on the page
            should reflow while it happens. `pointer-events-none` keeps the
            graph usable — the card reports, it does not block. */}
        {progress ? (
          <div className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center p-4">
            <div
              className="w-full max-w-sm rounded-lg border bg-background/95 p-4 shadow-lg"
              role="status"
              aria-live="polite"
            >
              <BuildProgress progress={progress} />
            </div>
          </div>
        ) : null}
        {opened ? (
          <GraphPane
            graph={opened.graph}
            stale={false}
            savedFile={opened.file}
            onExitSaved={() => setOpened(null)}
            metric={metric}
            neighborLimit={neighborLimit}
            selected={selected}
            onSelect={onSelect}
            onControls={() => setControlsOpen(true)}
            onOpenSaved={setOpened}
          />
        ) : (
          <pageData.Gate keys={["snapshot"]} pulse={<GraphLoading />} error={null}>
            {({ snapshot: data }) => {
              const matchesRequest =
                data.status.from === from &&
                data.status.to === to &&
                data.status.mode === mode &&
                data.status.nodeLimit === nodeLimit;
              if (!matchesRequest) return <GraphLoading />;
              if (!data.graph) {
                return (
                  <UnbuiltGraph
                    records={data.status.records}
                    building={build.pending}
                    onBuild={() => void buildAgain()}
                  />
                );
              }
              return (
                <GraphPane
                  graph={data.graph}
                  stale={data.status.stale}
                  metric={metric}
                  neighborLimit={neighborLimit}
                  selected={selected}
                  onSelect={onSelect}
                  onControls={() => setControlsOpen(true)}
                  onOpenSaved={setOpened}
                />
              );
            }}
          </pageData.Gate>
        )}
      </div>
    </section>
  );
}

/**
 * The canvas and the one line that says what is drawn on it.
 *
 * Two sources reach it — the period's own snapshot, and a file opened from the
 * saved list — and the whole difference is `savedFile`: a saved graph has no
 * live period to be stale against, and it needs the way back.
 */
function GraphPane({
  graph,
  stale,
  savedFile,
  onExitSaved,
  metric,
  neighborLimit,
  selected,
  onSelect,
  onControls,
  onOpenSaved,
}: {
  graph: ProductGraph;
  /** The period's data moved on since this snapshot was built. */
  stale: boolean;
  /** Set when the graph came off the saved list, so the line can say so. */
  savedFile?: string;
  onExitSaved?: () => void;
  metric: ProductGraphMetric;
  neighborLimit: number;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onControls: () => void;
  onOpenSaved: (saved: OpenedSnapshot) => void;
}) {
  const edges = graph.directedEdges / 2;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-none flex-wrap items-center justify-between gap-2 pb-2 text-xs">
        {savedFile && onExitSaved ? (
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-active/10 px-2 py-0.5 text-xs font-medium text-active">
              Tersimpan
            </span>
            <span className="text-muted-foreground tabular-nums">
              {formatDate(graph.from)} – {formatDate(graph.to - DAY_MS)} ·{" "}
              {MODE_NAMES[graph.mode]} · {graph.nodeLimit.toLocaleString("id-ID")} produk teratas
              <span aria-hidden="true"> · </span>
              Dibuat {formatDate(graph.builtAt)} {formatTime(graph.builtAt)}
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground tabular-nums">
            {graph.records.toLocaleString("id-ID")} transaksi ·{" "}
            {graph.nodes.length.toLocaleString("id-ID")} produk ·{" "}
            {edges.toLocaleString("id-ID")} hubungan
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            Dibuat {formatDate(graph.builtAt)} {formatTime(graph.builtAt)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {stale ? (
            <p className="font-medium text-destructive" role="status">
              Ada transaksi baru. Buat ulang untuk memperbarui jaringan.
            </p>
          ) : null}
          {savedFile && onExitSaved ? (
            <Button type="button" size="sm" variant="outline" onClick={onExitSaved}>
              Kembali ke periode ini
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-md border">
        {graph.nodes.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center px-4 text-center">
            <div>
              <h2 className="text-base font-semibold">Belum ada produk pada periode ini</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Jaringan akan muncul setelah ada transaksi dengan produk yang tercatat.
              </p>
            </div>
          </div>
        ) : (
          <NetworkCanvas
            key={`${savedFile ?? "live"}:${graph.from}:${graph.to}:${graph.mode}:${graph.builtAt}`}
            graph={graph}
            metric={metric}
            neighborLimit={neighborLimit}
            selected={selected}
            onSelect={onSelect}
            onControls={onControls}
            onOpenSaved={onOpenSaved}
          />
        )}
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="flex justify-between gap-2 text-xs font-medium">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{value}</span>
      </span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        thumbLabels={[label]}
        onValueChange={([next]) => {
          if (next !== undefined) onChange(next);
        }}
      />
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { key: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        {options.map((option) => (
          <Button
            key={option.key}
            type="button"
            size="sm"
            variant={value === option.key ? "default" : "ghost"}
            aria-pressed={value === option.key}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function BuildProgress({ progress }: { progress: ProductGraphProgress }) {
  const captions: Record<ProductGraphProgress["stage"], string> = {
    prepare: "Menyiapkan data",
    aggregate: "Mengumpulkan produk per minggu",
    select: "Memilih produk",
    read: "Menghitung transaksi bersama",
    layout: "Menyusun posisi produk",
    write: "Menyimpan jaringan",
    complete: "Jaringan siap",
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{captions[progress.stage]}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{progress.percent}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Kemajuan pembuatan jaringan"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

function GraphLoading() {
  return (
    <div
      className="flex h-full min-h-[300px] items-center justify-center rounded-md border"
      aria-hidden="true"
    >
      <div className="flex w-72 flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

function UnbuiltGraph({
  records,
  building,
  onBuild,
}: {
  records: number;
  building: boolean;
  onBuild: () => void;
}) {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center rounded-md border bg-muted/20 px-4">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <Network aria-hidden="true" className="size-8 text-muted-foreground" />
        <h2 className="text-base font-semibold">Jaringan belum dibuat</h2>
        <p className="text-sm text-muted-foreground">
          Buat jaringan untuk melihat produk yang berulang kali muncul dalam transaksi yang sama.
          {records > 0
            ? ` Ada ${records.toLocaleString("id-ID")} transaksi berisi produk pada periode ini.`
            : " Belum ada transaksi berisi produk pada periode ini."}
        </p>
        <Button type="button" onClick={onBuild} disabled={building}>
          <RefreshCw aria-hidden="true" className={cn("size-5", building && "animate-spin")} />
          Buat jaringan
        </Button>
      </div>
    </div>
  );
}
