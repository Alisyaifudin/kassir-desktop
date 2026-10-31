-- ============================================================================
-- migration-47   Queue every syncable row for its first upload.
-- ============================================================================
-- `src/services/sync` is the first implementation of the byte-stream protocol in
-- backend-docs/sync-contract.md, and the server it talks to was created from zero
-- for that protocol (backend contract §13): it has never seen a row from this
-- device. `_sync_at` is the push marker (contract §3.1) — a value means "this
-- exact row is already on the server", NULL means "owed" — so every marker left
-- by the retired timestamp API is a lie for the new one and has to be cleared.
--
-- Migration-44 step 13 carried this forcing commented out, on the grounds that
-- pushing the new nested shape before the server accepted it would be rejected.
-- It lives here instead of in 44 because 44 has shipped and a shipped migration is
-- immutable (src/services/db/migration-chain.test.ts pins its checksum).
--
-- One statement per table rather than a loop: SQL has no way to iterate the sync
-- set, and the set is exactly the contract's §2.1 list. `stocks`, `cashiers` and
-- the `tx_*` cart tables are deliberately absent — they never sync.
UPDATE pockets       SET pocket_sync_at = NULL;
UPDATE money         SET money_sync_at = NULL;
UPDATE products      SET product_sync_at = NULL;
UPDATE product_names SET product_name_sync_at = NULL;
UPDATE properties    SET property_sync_at = NULL;
UPDATE listings      SET listing_sync_at = NULL;
UPDATE images        SET image_sync_at = NULL;
UPDATE customers     SET customer_sync_at = NULL;
UPDATE suppliers     SET supplier_sync_at = NULL;
UPDATE extras        SET extra_sync_at = NULL;
UPDATE methods       SET method_sync_at = NULL;
UPDATE socials       SET social_sync_at = NULL;
UPDATE product_events SET product_event_sync_at = NULL;
UPDATE records       SET record_sync_at = NULL;
