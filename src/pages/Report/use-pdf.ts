import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { log } from "~/lib/log";
import type { ReportData } from "~/services/report/print";

/**
 * A rendered report, as a blob URL an `<iframe>` can show.
 *
 * The bytes cross IPC as a raw body (`tauri::ipc::Response` in `report_pdf`), so
 * what arrives is an `ArrayBuffer`, not a JSON array of numbers. Nothing is
 * written to disk for a preview: no path is ever named, which is what lets
 * `capabilities/default.json` stay as narrow as it is.
 *
 * The URL is revoked on unmount and on every re-render with new data — an object
 * URL pins its blob for the life of the page, and a day of reports would hold
 * every PDF the operator looked at.
 *
 * `data` must be memoised by the caller: it is the effect's dependency, and a
 * fresh object each render would re-render the PDF forever.
 */
export function useReportPdf(data: ReportData | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data === null) {
      setUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    let created: string | null = null;

    setError(null);
    void (async () => {
      try {
        const bytes = await invoke<ArrayBuffer>("report_pdf", { data });
        if (cancelled) return;
        created = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setUrl(created);
      } catch (cause) {
        log.error(cause instanceof Error ? cause : String(cause));
        if (cancelled) return;
        setUrl(null);
        setError("Gagal menyiapkan PDF laporan.");
      }
    })();

    return () => {
      cancelled = true;
      if (created !== null) URL.revokeObjectURL(created);
      setUrl(null);
    };
  }, [data]);

  return { url, error };
}

/** The bytes, for the download path — which must not create a blob URL. */
export async function renderReportPdf(data: ReportData): Promise<Uint8Array> {
  const bytes = await invoke<ArrayBuffer>("report_pdf", { data });
  return new Uint8Array(bytes);
}
