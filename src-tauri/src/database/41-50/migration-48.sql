-- Persist the code snapshot the draft's listing grid shows. `tx_listings`
-- already snapshots name/price/unit/qty; the code is the one editable field
-- that had nowhere to go.
ALTER TABLE tx_listings ADD COLUMN tx_listing_code TEXT NOT NULL DEFAULT '';
