import { toast } from "sonner";

/**
 * What to tell the cashier after a bulk import finished.
 *
 * All three upload panels (product, record, money history) used to end with an
 * unconditional `toast.success("Berhasil mengunggah")`, even when every row was
 * skipped as a duplicate — the same render then showed a panel listing the
 * skipped rows underneath it, saying the opposite. The counts that settle it are
 * already in scope in the loops, so the message is derived from them here, in
 * one place, instead of being hard-coded three times.
 */
export type UploadOutcome = {
  tone: "success" | "warning" | "error";
  message: string;
};

export function describeUpload({
  written,
  skipped,
  noun,
}: {
  written: number;
  skipped: number;
  noun: string;
}): UploadOutcome {
  // Nothing written is never a success — the file stays in the panel so the
  // operator can fix it and retry (see `notifyUpload`'s callers).
  if (written === 0) {
    return skipped === 0
      ? { tone: "error", message: "Berkas tidak berisi data." }
      : { tone: "error", message: `Tidak ada ${noun} yang bisa diunggah, ${skipped} dilewati.` };
  }

  if (skipped === 0) {
    return { tone: "success", message: `${written} ${noun} diunggah.` };
  }

  return {
    tone: "warning",
    message: `${written} ${noun} diunggah, ${skipped} dilewati.`,
  };
}

/** Show the outcome. The skipped panel stays the place the reasons are listed. */
export function notifyUpload(outcome: UploadOutcome) {
  switch (outcome.tone) {
    case "success":
      return toast.success(outcome.message);
    case "warning":
      return toast.warning(outcome.message);
    case "error":
      return toast.error(outcome.message);
  }
}
