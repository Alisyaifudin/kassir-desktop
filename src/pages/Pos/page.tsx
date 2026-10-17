/**
 * Scaffold. The sale half of what `src/pages/Shop` does with `mode = "sell"`,
 * under the post-migration-43 name for it: `incoming` — money in, stock
 * consumed. `Shop` is left in place for reference while this is built out.
 */
export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Pos</h1>
        <p className="text-muted-foreground text-normal">Transaksi penjualan</p>
      </div>
    </div>
  );
}
