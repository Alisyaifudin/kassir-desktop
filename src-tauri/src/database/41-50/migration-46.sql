-- Allow webp product images. Numbered 46 rather than 42 to stay clear of the
-- migrations other branches already claim (dev has 42, ai/list have 43-45), so
-- merging those branches cannot produce a checksum clash on a shared database.
INSERT OR IGNORE INTO img_mimes (v) VALUES ('image/webp');
