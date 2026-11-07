import { useMemo, useState } from "react";
import { Either } from "effect";
import { Network, RefreshCw } from "lucide-react";
import { readSnapshot, buildSnapshot, pageData } from "./data";
import { NetworkCanvas } from "./z-Canvas";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import { Skeleton } from "~/components/ui/skeleton";
import { MODE_NAMES } from "~/lib/constants";
import { formatDate, formatTime } from "~/lib/date";
import { cn } from "~/lib/utils";
import type {
  ProductGraphMetric,
  ProductGraphMode,
  ProductGraphProgress,
  ProductGraphStatus,
} from "~/lib/product-graph";
import { ProductGraphError } from "~/lib/product-graph";
import { useRange } from "../use-range";

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
  const frame = pageData.useFrame(["snapshot"]);
  const refresh = pageData.useRefresh();
  const build = pageData.useMutation<void, ProductGraphStatus, ProductGraphError>(
    () => buildSnapshot(from, to, mode, nodeLimit, setProgress),
    { refetch: ["snapshot"] },
  );
  const snapshotState = pageData.use("snapshot");
  const snapshot = snapshotState.type === "success" ? snapshotState.data : null;
  const selectedIndex = snapshot?.graph?.nodes.findIndex((node) => node.id === selectedId) ?? -1;
  const selected = selectedIndex >= 0 ? selectedIndex : null;
  const onSelect = (index: number | null) => {
    setSelectedId(index === null ? null : (snapshot?.graph?.nodes[index]?.id ?? null));
  };

  const buildAgain = async () => {
    setProgress({ stage: "prepare", percent: 0, done: 0, total: 1 });
    const result = await build.mutate(undefined);
    if (Either.isLeft(result)) setProgress(null);
    else setProgress({ stage: "complete", percent: 100, done: 1, total: 1 });
  };

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex-none border-b pb-2">
        <h1 className="mb-2 text-base font-semibold">Jaringan produk</h1>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Jenis transaksi</span>
              <div className="flex items-center gap-1" role="group" aria-label="Jenis transaksi">
                {(["incoming", "outcoming"] as const).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={mode === option ? "default" : "ghost"}
                    aria-pressed={mode === option}
                    onClick={() => onMode(option)}
                  >
                    {MODE_NAMES[option]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Ketebalan garis</span>
              <div className="flex items-center gap-1" role="group" aria-label="Ukuran hubungan">
                <Button
                  type="button"
                  size="sm"
                  variant={metric === "count" ? "default" : "ghost"}
                  aria-pressed={metric === "count"}
                  onClick={() => setMetric("count")}
                >
                  Jumlah bersama
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={metric === "lift" ? "default" : "ghost"}
                  aria-pressed={metric === "lift"}
                  onClick={() => setMetric("lift")}
                >
                  Di atas peluang
                </Button>
              </div>
            </div>

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
          <Button type="button" onClick={() => void buildAgain()} disabled={build.pending}>
            <RefreshCw
              aria-hidden="true"
              className={cn("size-5", build.pending && "animate-spin")}
            />
            Buat ulang
          </Button>
        </div>
        {progress ? <BuildProgress progress={progress} /> : null}
        {build.error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {build.error.message}
          </p>
        ) : null}
        {frame.error ? (
          <div
            className="mt-2 flex items-center justify-between gap-3 rounded-md border border-destructive/40 px-3 py-2"
            role="alert"
          >
            <p className="text-sm text-destructive">{frame.error.message}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => refresh("snapshot")}>
              Coba lagi
            </Button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 pt-2">
        <pageData.Gate keys={["snapshot"]} pulse={<GraphLoading />} error={null}>
          {({ snapshot: data }) => {
            const matchesRequest =
              data.status.from === from &&
              data.status.to === to &&
              data.status.mode === mode &&
              data.status.nodeLimit === nodeLimit;
            if (!matchesRequest) return <GraphLoading />;
            return data.graph ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-none flex-wrap items-center justify-between gap-2 pb-2 text-xs">
                  <p className="text-muted-foreground">
                    {data.status.records.toLocaleString("id-ID")} transaksi ·{" "}
                    {data.status.nodes.toLocaleString("id-ID")} produk ·{" "}
                    {data.status.edges.toLocaleString("id-ID")} hubungan
                    <span className="mx-2" aria-hidden="true">
                      ·
                    </span>
                    Dibuat {formatDate(data.status.builtAt)} {formatTime(data.status.builtAt)}
                  </p>
                  {data.status.stale ? (
                    <p className="font-medium text-destructive" role="status">
                      Ada transaksi baru. Buat ulang untuk memperbarui jaringan.
                    </p>
                  ) : null}
                </div>
                <div className="flex min-h-0 flex-1 overflow-hidden rounded-md border">
                  {data.graph.nodes.length === 0 ? (
                    <div className="flex h-full min-h-[300px] items-center justify-center px-4 text-center">
                      <div>
                        <h2 className="text-base font-semibold">
                          Belum ada produk pada periode ini
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Jaringan akan muncul setelah ada transaksi dengan produk yang tercatat.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <NetworkCanvas
                      key={`${data.status.from}:${data.status.to}:${data.status.mode}:${data.status.builtAt}`}
                      graph={data.graph}
                      metric={metric}
                      neighborLimit={neighborLimit}
                      selected={selected}
                      onSelect={onSelect}
                    />
                  )}
                </div>
              </div>
            ) : (
              <UnbuiltGraph records={data.status.records} />
            );
          }}
        </pageData.Gate>
      </div>
    </section>
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
    <label className="flex w-40 flex-col gap-1">
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
    <div className="mt-2 flex items-center gap-3" role="status" aria-live="polite">
      <span className="w-52 shrink-0 text-xs text-muted-foreground">
        {captions[progress.stage]}
      </span>
      <div
        className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted"
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
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {progress.percent}%
      </span>
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

function UnbuiltGraph({ records }: { records: number }) {
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
      </div>
    </div>
  );
}
