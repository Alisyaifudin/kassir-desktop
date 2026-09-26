export function Summary({ grandTotal, change }: { grandTotal: number; change: number }) {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex justify-between items-end border-b pb-4">
        <span className="font-medium text-muted-foreground pb-2">Total</span>
        <span className="text-big font-bold leading-none">
          Rp{grandTotal.toLocaleString("id-ID")}
        </span>
      </div>
      <div className="flex justify-between items-end">
        <span className="font-medium text-muted-foreground pb-2">Kembalian</span>
        <span className="text-grand-total font-bold text-primary leading-none">
          Rp{change.toLocaleString("id-ID")}
        </span>
      </div>
    </div>
  );
}
