import { Button } from "~/components/ui/button";
import { ProgressBar } from "~/components/ProgressBar";
import { TextError } from "~/components/TextError";
import type { BackupProgress } from "~/lib/backup";
import { useBackup } from "./use-backup-data";

/**
 * The one word for each stage the Rust side reports.
 *
 * The keywords come over IPC; the sentences live here, next to the panel that
 * renders them, so a wording change is a UI change. Same split as the sync phases.
 */
const STAGE_LABEL: Record<BackupProgress["stage"], string> = {
  snapshot: "Menyalin database",
  verify: "Memeriksa database",
  hash: "Membuat ringkasan",
  compress: "Mengompres",
  finalize: "Menyimpan",
};

/**
 * The whole-install backup: one archive holding the database and the settings.
 *
 * It sits apart from the Produk/Riwayat rows on purpose — those export a *report*
 * the shop can import back one entity at a time, while this copies the install
 * itself and is the thing to hand over when the machine is replaced.
 *
 * A run takes seconds, and most of it is spent in stages that cannot say how far
 * along they are, so the bar is indeterminate until the first frame arrives and
 * then covers the whole cycle: one bar that fills once, never five bars that each
 * restart. The percentage is the answer to "is it still working?" — the stage
 * sentence is the answer to "what is it doing?".
 */
export function BackupData() {
  const { loading, error, handleBackup, progress } = useBackup();
  const caption = progress === null ? "Menyiapkan" : STAGE_LABEL[progress.stage];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-medium">Seluruh data</h3>
          <p className="text-sm text-muted-foreground">
            Database dan pengaturan aplikasi disimpan ke satu file .zip. Gambar produk tidak ikut.
          </p>
        </div>
        <Button type="button" onClick={handleBackup} disabled={loading}>
          {loading ? "Mencadangkan…" : "Simpan Cadangan"}
        </Button>
      </div>
      {loading ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm">{caption}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {progress === null ? "\u00a0" : `${progress.percent}%`}
            </p>
          </div>
          <ProgressBar percent={progress?.percent ?? null} label="Kemajuan pencadangan" />
        </div>
      ) : null}
      <TextError>{error}</TextError>
    </div>
  );
}
