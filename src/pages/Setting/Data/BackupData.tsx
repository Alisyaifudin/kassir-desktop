import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useBackup } from "./use-backup-data";

/**
 * The whole-install backup: one archive holding the database and the settings.
 *
 * It sits apart from the Produk/Riwayat rows on purpose — those export a *report*
 * the shop can import back one entity at a time, while this copies the install
 * itself and is the thing to hand over when the machine is replaced.
 */
export function BackupData() {
  const { loading, error, handleBackup } = useBackup();
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
          Simpan Cadangan <Spinner when={loading} />
        </Button>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
}
