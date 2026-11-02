import { IOError } from "~/lib/effect-error";
import { saveJson } from "~/lib/export";

export { saveJson };

/** The message to show for a service error or a file error alike. */
export function messageOf(error: { message: string } | IOError): string {
  return error instanceof IOError ? error.e.message : error.message;
}

/**
 * Bytes as the backup toast says them: `3,2 MB`, not `3355443`.
 *
 * The number is there so the cashier can see the archive is not empty — a backup
 * that says "0 B" is worth noticing on the spot rather than on the day it is
 * needed. Decimal comma, because the rest of the app is Indonesian.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  // Round before the unit check, so 1048575 bytes reads `1 MB` rather than the
  // impossible-looking `1024 KB`.
  const roundedKb = Math.round(kb);
  if (roundedKb < 1024) return `${roundedKb} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",").replace(",0", "")} MB`;
}
