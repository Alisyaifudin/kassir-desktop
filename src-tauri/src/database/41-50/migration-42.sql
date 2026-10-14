ALTER TABLE extras ADD COLUMN extra_flag INTEGER NOT NULL DEFAULT 0;

-- WebP joins the image mime lookup.
--
-- `images.image_mime` is a foreign key into `img_mimes`, so this row is the whole
-- database-side change — there is no CHECK constraint to rebuild. The lookup
-- itself is created and seeded with png/jpeg in migration-36, which has already
-- run, so it is added here instead of there.
--
-- OR IGNORE so a database where the row was added by hand still migrates.
INSERT OR IGNORE INTO img_mimes (v) VALUES ('image/webp');
