/**
 * A record with nothing to classify.
 *
 * In practice this is a hand-typed `/transaction` record, which `scope.sql`
 * already keeps out of the report's figures — but the rail lists whatever the day
 * holds, so meeting one here has to read as "this one has no lines", not as a
 * broken screen or an empty pair of tables.
 */
export function OutOfScope() {
  return (
    <p className="px-1 text-sm text-muted-foreground">
      Rekaman ini tidak punya baris barang maupun biaya, jadi tidak ada yang perlu
      diklasifikasi.
    </p>
  );
}
