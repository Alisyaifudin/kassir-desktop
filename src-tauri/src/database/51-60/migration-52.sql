-- The push's dirty set, in push order (SYNC-V2 §4.6).
--
-- Every push batch opens with
--
--   SELECT … FROM records WHERE record_sync_at IS NULL
--     ORDER BY record_updated_at, record_id LIMIT 1000
--
-- and `countUnsynced` runs that predicate twice more per push (once to plan the
-- bar, once to report what is left). With no index on `record_sync_at` the plan
-- was `SCAN records` + `USE TEMP B-TREE FOR ORDER BY`: every batch sorted the
-- whole dirty set and then threw all but 1,000 rows away. On a till with 70k
-- records that is ~15 ms per call, three calls per batch, every batch of a first
-- upload — and it grows with history, which a first upload is made of.
--
-- The partial predicate is exactly the one all three queries carry, so the index
-- holds only the rows still owed to the server: an ordered scan with no sort
-- step, shrinking as the upload drains. It costs nothing to maintain once the
-- debt is settled, because a row leaves the index as its `record_sync_at` is set.
CREATE INDEX record_dirty_idx
  ON records (record_updated_at, record_id)
  WHERE record_sync_at IS NULL;
