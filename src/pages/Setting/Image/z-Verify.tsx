import { useState } from "react";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { ProgressBar } from "~/components/ProgressBar";
import { TextError } from "~/components/TextError";
import {
  imageOptimizeCancel,
  imageOptimizeVerify,
  type ImageOptProgress,
  type ImageOptVerify,
} from "~/lib/image-opt";
import { log } from "~/lib/log";
import { Panel } from "../z-Panel";
import { pageData } from "./data";
import { STAGE_LABEL } from "./util-stage";

/**
 * The integrity pass: the one thing the optimizer cannot notice on its own.
 *
 * A name is the content, so the optimizer trusts it — which is what makes a second
 * visit cheap and a file whose bytes drifted invisible. Sinkronisasi is where it
 * bites: the name is the shared address, so a peer that is offered a mismatched
 * download refuses it (`sync_blob.rs`) and could not invent the right one. This
 * panel is the only place that reads the bytes back and writes a correct name.
 *
 * Deliberately its own button: it reads every byte in the catalogue, which is work
 * the run's own copy promises not to do, and it should not look like a free read.
 * `refetch: ["plan"]` *is* wired, unlike a pure read would need: a repair can change
 * the stored bytes (a JPEG repaired on the way is transcoded), so the size line
 * above must not go stale.
 */
export function Verify() {
  const [progress, setProgress] = useState<ImageOptProgress | null>(null);
  const [result, setResult] = useState<ImageOptVerify | null>(null);
  const verify = pageData.useMutation(
    (onProgress: (progress: ImageOptProgress) => void) => imageOptimizeVerify(onProgress),
    { refetch: ["plan"] },
  );

  async function handleVerify() {
    setResult(null);
    setProgress(null);
    const outcome = await verify.mutate(setProgress);
    setProgress(null);
    if (Either.isLeft(outcome)) {
      log.error(new Error(outcome.left.message));
      return;
    }
    setResult(outcome.right);
    if (!outcome.right.cancelled && outcome.right.repaired > 0) toast.success(sentenceOf(outcome.right));
  }

  function handleCancel() {
    void Effect.runPromise(imageOptimizeCancel()).catch((error: unknown) => {
      log.error(error instanceof Error ? error : new Error(String(error)));
    });
  }

  return (
    <Panel title="Periksa berkas">
      <p className="text-sm text-muted-foreground">
        Membaca ulang dan menguraikan isi setiap gambar yang dipakai produk dan setiap sampul combo, lalu membandingkannya dengan namanya. Nama berkas adalah kunci
        yang dipakai bersama lewat sinkronisasi: bila isinya tidak lagi cocok dengan namanya, berkas
        disimpan ulang dengan nama yang benar dan barisnya diperbarui, lalu dikirim ulang pada
        sinkronisasi berikutnya. Pemeriksaan ini membaca seluruh katalog, jadi jalankan saat
        aplikasi tidak sedang sibuk.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void handleVerify()} disabled={verify.pending}>
          {verify.pending ? "Memeriksa…" : "Periksa & Perbaiki"}
        </Button>
        {verify.pending ? (
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Batal
          </Button>
        ) : null}
      </div>
      {verify.pending ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm">{STAGE_LABEL.verify}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {progress === null || progress.total === 0
                ? "\u00a0"
                : `${progress.done.toLocaleString("id-ID")}/${progress.total.toLocaleString("id-ID")} · ${progress.percent}%`}
            </p>
          </div>
          <ProgressBar percent={progress?.percent ?? null} label="Kemajuan pemeriksaan gambar" />
        </div>
      ) : null}
      <TextError>{verify.error === null ? null : verify.error.message}</TextError>
      {result === null ? null : (
        <p role="status" className="text-base">
          {sentenceOf(result)}
        </p>
      )}
    </Panel>
  );
}

function sentenceOf(summary: ImageOptVerify): string {
  const checked = summary.checked.toLocaleString("id-ID");
  if (summary.cancelled) {
    return `Pemeriksaan dibatalkan setelah ${checked} gambar; ${summary.repaired.toLocaleString("id-ID")} sudah diperbaiki.`;
  }
  // "Semuanya cocok" is a claim about the whole pass, so it may only stand when
  // every exception count is zero — the clauses below enumerate them otherwise, and
  // a headline that contradicts its own tail is worse than a plain one.
  const exceptions = summary.corrupt + summary.skipped + summary.missing + summary.failed;
  const headline =
    summary.repaired === 0
      ? exceptions === 0
        ? `${checked} berkas diperiksa dan semuanya cocok dengan namanya.`
        : `${checked} berkas diperiksa.`
      : `${checked} berkas diperiksa, ${summary.repaired.toLocaleString("id-ID")} diperbaiki dan akan diunggah ulang.`;

  const parts = [
    headline,
    summary.corrupt === 0
      ? null
      : `${summary.corrupt.toLocaleString("id-ID")} berkas tidak terbaca sebagai gambar dan dibiarkan apa adanya — jangan diperbaiki, karena namanya akan mengesahkan kerusakannya; pulihkan dari cadangan atau perangkat lain.`,
    summary.skipped === 0
      ? null
      : `${summary.skipped.toLocaleString("id-ID")} belum bernama hash dan dilewati — jalankan Optimasi untuk itu.`,
    summary.missing === 0
      ? null
      : `${summary.missing.toLocaleString("id-ID")} berkasnya tidak ada di perangkat ini.`,
    summary.failed === 0
      ? null
      : `${summary.failed.toLocaleString("id-ID")} gagal dan dibiarkan apa adanya.`,
  ].filter((part) => part !== null);
  return parts.join(" ");
}
