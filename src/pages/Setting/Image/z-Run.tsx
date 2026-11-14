import { useState } from "react";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { ProgressBar } from "~/components/ProgressBar";
import { TextError } from "~/components/TextError";
import {
  imageOptimizeCancel,
  imageOptimizeRun,
  type ImageOptProgress,
  type ImageOptSummary,
} from "~/lib/image-opt";
import { log } from "~/lib/log";
import { formatSize } from "../Data/util-file";
import { Panel } from "../z-Panel";
import { pageData } from "./data";

/**
 * The one word for each phase the Rust side reports. The keywords come over IPC;
 * the sentences live here, next to the panel that renders them, the same split the
 * sync phases and the backup stages use.
 */
const STAGE_LABEL: Record<ImageOptProgress["stage"], string> = {
  scan: "Memeriksa gambar",
  convert: "Mengubah dan menggabungkan",
};

/**
 * The action: one button, one bar, one sentence when it is done.
 *
 * The button is chrome — it does not wait for the plan, because the plan does not
 * decide whether the job is worth running (it is safe and idempotent on an already
 * optimized catalogue: every picture is skipped and the summary says so). The
 * numbers are in the panel above, and they are what the operator reads before
 * pressing it.
 *
 * `refetch: ["plan"]` is what keeps the two panels honest: while the job runs, the
 * plan keeps its last answer and carries `refetching`, so the figures do not blink
 * away; when the job lands, the plan is re-read and the size above is the size
 * after.
 */
export function Run() {
  // `null` until the first frame: the bar's indeterminate state, and what tells
  // the panel that nothing is running yet.
  const [progress, setProgress] = useState<ImageOptProgress | null>(null);
  const [result, setResult] = useState<ImageOptSummary | null>(null);
  const run = pageData.useMutation(
    (onProgress: (progress: ImageOptProgress) => void) => imageOptimizeRun(onProgress),
    { refetch: ["plan"] },
  );

  async function handleRun() {
    setResult(null);
    setProgress(null);
    const outcome = await run.mutate(setProgress);
    setProgress(null);
    if (Either.isLeft(outcome)) {
      // The typed failure is on `run.error`, which the panel draws below.
      log.error(new Error(outcome.left.message));
      return;
    }
    setResult(outcome.right);
    if (!outcome.right.cancelled) toast.success(sentenceOf(outcome.right));
  }

  function handleCancel() {
    // Fire-and-forget: the job answers through its own summary, not here.
    void Effect.runPromise(imageOptimizeCancel()).catch((error: unknown) => {
      log.error(error instanceof Error ? error : new Error(String(error)));
    });
  }

  const caption = progress === null ? "Menyiapkan" : STAGE_LABEL[progress.stage];

  return (
    <Panel title="Optimalkan">
      <p className="text-sm text-muted-foreground">
        Mengubah PNG dan JPEG menjadi WebP, mengecilkan sisi terpanjang ke 1600 px, lalu
        menggabungkan gambar yang isinya sama supaya hanya satu berkas yang disimpan. Gambar yang
        berubah akan diunggah ulang pada sinkronisasi berikutnya.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void handleRun()} disabled={run.pending}>
          {run.pending ? "Mengoptimalkan…" : "Jalankan Optimasi"}
        </Button>
        {run.pending ? (
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Batal
          </Button>
        ) : null}
      </div>
      {run.pending ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm">{caption}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {progress === null
                ? "\u00a0"
                : progress.total === 0
                  ? "\u00a0"
                  : `${progress.done.toLocaleString("id-ID")}/${progress.total.toLocaleString("id-ID")} · ${progress.percent}%`}
            </p>
          </div>
          <ProgressBar percent={progress?.percent ?? null} label="Kemajuan optimasi gambar" />
          {progress === null || progress.bytesBefore === 0 ? null : (
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatSize(progress.bytesBefore)} → {formatSize(progress.bytesAfter)}
            </p>
          )}
        </div>
      ) : null}
      <TextError>{run.error === null ? null : run.error.message}</TextError>
      {result === null ? null : (
        // `role="status"`: the answer to "what did it do?", announced, not only
        // drawn. It reports what happened, never a promise about disk space.
        <p role="status" className="text-base">
          {sentenceOf(result)}
        </p>
      )}
    </Panel>
  );
}

function sentenceOf(summary: ImageOptSummary): string {
  if (summary.cancelled) {
    return `Optimasi dibatalkan. ${summary.converted.toLocaleString("id-ID")} gambar sempat dikonversi dan tetap tersimpan.`;
  }
  const touched = summary.converted + summary.renamed;
  if (touched === 0 && summary.reclaimed === 0) {
    return summary.missing === 0
      ? "Semua gambar sudah optimal, tidak ada yang perlu diubah."
      : `Semua gambar yang ada di perangkat ini sudah optimal. ${summary.missing.toLocaleString("id-ID")} gambar tidak ada berkasnya dan dilewati.`;
  }
  const parts = [
    `${summary.converted.toLocaleString("id-ID")} gambar dikonversi ke WebP`,
    summary.renamed === 0 ? null : `${summary.renamed.toLocaleString("id-ID")} diganti namanya`,
    summary.reclaimed === 0
      ? null
      : `${summary.reclaimed.toLocaleString("id-ID")} berkas lama dihapus`,
  ].filter((part) => part !== null);
  const saved = summary.bytesBefore - summary.bytesAfter;
  const size =
    saved > 0
      ? `${formatSize(summary.bytesBefore)} → ${formatSize(summary.bytesAfter)} (hemat ${formatSize(saved)})`
      : `${formatSize(summary.bytesBefore)} → ${formatSize(summary.bytesAfter)}`;
  const failed =
    summary.failed === 0
      ? ""
      : ` ${summary.failed.toLocaleString("id-ID")} gambar gagal dan dibiarkan apa adanya.`;
  return `${parts.join(", ")}. ${size}.${failed}`;
}
