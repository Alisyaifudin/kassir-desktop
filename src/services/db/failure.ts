import { log } from "~/lib/log";
import { formatError } from "~/lib/utils";
import { DbError } from ".";

/**
 * Turn a driver failure into a `DbError`: one Indonesian sentence for the
 * cashier, and the raw text for the log.
 *
 * The page fallbacks render `error.message` directly, so the SQLite text
 * (`database is locked`, `no such table: records`, …) must not end up in it — it
 * is unactionable on a POS terminal, it leaks schema names, and its embedded
 * newline breaks the layout. The diagnostic goes to Setting → Log instead, the
 * same split the Rust commands already use (`export.rs`: "The raw OS error is a
 * developer detail: log it, do not render it").
 */
export function dbFailure(sentence: string, e: unknown): DbError {
  const detail = formatError(e);
  log.error(`db: ${sentence} | ${detail}`);
  return new DbError({ message: sentence, detail });
}

export const DB_READ_FAILED = "Data gagal dibaca. Coba lagi.";
export const DB_WRITE_FAILED = "Data gagal disimpan. Coba lagi.";
export const DB_OPEN_FAILED = "Database gagal dibuka. Jalankan ulang aplikasi.";
