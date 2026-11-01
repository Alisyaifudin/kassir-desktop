import { log } from "~/lib/log";

/** What `PRAGMA journal_mode` answers: one row per connection, with the new mode. */
type JournalModeRow = { journal_mode?: unknown };

/** The slice of the plugin's handle this needs — narrow, so a test can stand in. */
type QueryHandle = { select: (query: string) => Promise<unknown> };

/**
 * Puts the database in write-ahead logging, once per file.
 *
 * ## Why
 *
 * The journal mode is a property of the file, and nothing in this app ever set
 * it: sqlx deliberately leaves it alone unless asked
 * (`sqlx-sqlite`'s `SqliteConnectOptions`: "Don't set `journal_mode` unless the
 * user requested it"), so a fresh install ran in rollback-journal mode while a
 * database that was ever switched — by hand, by a tool, by an older build — stayed
 * in WAL. Two installs of the same build therefore behaved differently under
 * contention, which is the worst kind of difference to debug from a shop.
 *
 * In rollback-journal mode a writer holding `RESERVED` blocks readers at the
 * commit, and this app reads constantly (the catalogue, the cart, the till) while
 * a sale also writes every 100 ms. In WAL, readers never block and never get
 * blocked; only writers queue, and the sync merge already keeps its write
 * transactions short (`merge.ts` slices them).
 *
 * ## Why it cannot fail the app
 *
 * A filesystem that cannot host `-wal`/`-shm` — a network share, a locked file —
 * refuses the switch, and so does a database another connection is reading at the
 * wrong moment. Refusing to open the app over that would be far worse than a
 * longer write lock, so this is best effort and the outcome is logged either way.
 *
 * Not a migration on purpose: SQLite will not change journal mode inside a
 * transaction, and sqlx wraps every migration in one.
 */
export async function enableWriteAheadLog(db: QueryHandle): Promise<void> {
  try {
    const rows = await db.select("PRAGMA journal_mode = WAL");
    const mode = Array.isArray(rows) ? (rows[0] as JournalModeRow | undefined)?.journal_mode : null;
    if (mode === "wal") {
      log.info("db: journal mode is wal");
      return;
    }
    log.info(`db: journal mode is ${String(mode)} — write-ahead logging was refused`);
  } catch (error) {
    log.info(
      `db: journal mode unchanged (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}
