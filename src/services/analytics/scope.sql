-- The one definition of *which records a report is about*, shared by the
-- TypeScript service (imported with `?raw`, see `scope()` in `live.ts`) and the
-- Rust graph builder (`src-tauri/src/graph.rs`), so the network page at
-- `/network` cannot quietly measure a different week than the charts
-- next to it.
--
-- Three rules, the same three every other read in this service follows:
--   * deleted records are out;
--   * `record_flag` bit 0 (hand-typed adjustments, see FLAGS.md) is out — a
--     figure that included them would be measuring something else;
--   * a record belongs to the day its effective date says — paid, else credit,
--     else created — which is the day the day list, Beranda and the record page
--     show, so a settled credit lands on the day it was paid.
--
-- Substitutions, both sides, no exceptions:
--   `{r}`  the table alias: `r.` when the query aliases `records`, `` when not.
--          A column named here must never be written with an alias inline.
--   `$1`   `from`, inclusive      `$2`  `to`, exclusive — written first, always.
--
-- `--` comments are stripped before this is spliced into a statement: a comment
-- line a `WHERE` has been written in front of would comment the `WHERE` out.
--
-- `$1`/`$2` come first because `bun:sqlite` binds arguments by the position they
-- appear in the statement rather than by their number (the note on `marginsSql`
-- in `live.ts`), and every caller writes the scope first. The Rust builder passes
-- these numbered SQLite placeholders to SQLx unchanged and binds in that same
-- order.
{r}record_deleted_at IS NULL
AND ({r}record_flag & 1) = 0
AND COALESCE({r}record_paid_at, {r}record_credit_at, {r}record_created_at) >= $1
AND COALESCE({r}record_paid_at, {r}record_credit_at, {r}record_created_at) < $2
