import { describe, expect, test } from "bun:test";
import { enableWriteAheadLog } from "./journal";

/**
 * The journal mode is a property of the database *file*, and nothing ever set it:
 * sqlx leaves it alone unless asked, so a fresh install ran in rollback-journal
 * mode while a database that was ever switched stayed in WAL. These tests pin the
 * two halves of the fix — it asks for WAL, and it never fails the app.
 */
describe("enableWriteAheadLog", () => {
  test("asks SQLite for WAL, once, before the first query", async () => {
    const queries: string[] = [];
    await enableWriteAheadLog({
      select: async (query) => {
        queries.push(query);
        return [{ journal_mode: "wal" }];
      },
    });

    expect(queries).toEqual(["PRAGMA journal_mode = WAL"]);
  });

  test("a refused switch is reported and nothing else", async () => {
    // What an in-memory or otherwise locked database answers: no switch, no error.
    await expect(
      enableWriteAheadLog({ select: async () => [{ journal_mode: "delete" }] }),
    ).resolves.toBeUndefined();
  });

  test("a filesystem that cannot host -wal does not stop the app opening", async () => {
    // A network share refuses `-wal`/`-shm`. Failing the open over it would be far
    // worse than the longer write lock it keeps: the merge's slices bound that.
    await expect(
      enableWriteAheadLog({
        select: async () => {
          throw new Error("database is locked");
        },
      }),
    ).resolves.toBeUndefined();
  });
});
