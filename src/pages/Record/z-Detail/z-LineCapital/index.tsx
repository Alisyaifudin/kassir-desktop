import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { InputCurrency } from "~/components/ui/input-currency";
import { Textarea } from "~/components/ui/textarea";
import { useUser } from "~/hooks/use-user";
import type { RecordFull, RecordListing } from "~/services/record";
import { roundToFix } from "~/services/record/round";
import { useChangeLineCapital } from "./use-change-line-capital";

/**
 * The escape hatch for a `modal` that was entered with the wrong figure.
 *
 * A sale does not price its own cost: it carries a copy of the cost of the stock
 * lot it drew from. One purchase booked with the wrong figure therefore hands
 * that figure to every sale of the product afterwards, and each of those lines
 * reads as an enormous loss — a 100.000 card "costing" 2.327.000 is a loss of 2,2
 * juta, which is how a report ends up claiming the shop lost millions selling
 * phone credit.
 *
 * It is deliberately loud and deliberately narrow: admin only, one line at a
 * time, a reason typed by hand, and a warning that names what it does *not* fix.
 */
export function LineCapital({ record, listing }: { record: RecordFull; listing: RecordListing }) {
  const user = useUser();
  // The gate lives here, not only in the caller that decides whether to render a
  // cost column: a purchase shows its cost to every cashier, and the pencil that
  // sits beside it must still be the admin's alone.
  if (user.role !== "admin") return null;
  return <CapitalDialog record={record} listing={listing} by={user.name} />;
}

/** The dialog itself, behind the gate, so its hooks are never skipped. */
function CapitalDialog({
  record,
  listing,
  by,
}: {
  record: RecordFull;
  listing: RecordListing;
  by: string;
}) {
  // The same rounding the row above prints with, so the dialogue cannot quote a
  // figure that differs by a rupiah from the one the admin clicked.
  const money = (value: number) => roundToFix(value, record.fix).toLocaleString("id-ID");
  const [open, setOpen] = useState(false);
  const [capital, setCapital] = useState(listing.capital);
  const [reason, setReason] = useState("");
  const { loading, error, change } = useChangeLineCapital(record.id, listing.id, by);

  useEffect(() => {
    if (!open) return;
    setCapital(listing.capital);
    setReason("");
  }, [open, listing.capital]);

  // Reading beyond the line's own snapshot is the admin's decision to make on
  // facts, so the price it sold for is on screen next to the cost.
  const believable = capital > 0 && capital < listing.price;
  const laba = (listing.price - capital) * listing.qty;

  async function save() {
    if (await change(capital, reason)) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Ubah modal tercatat ${listing.name}`}
          title="Ubah modal tercatat (khusus admin)"
        >
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Ubah modal tercatat?</DialogTitle>
          <DialogDescription>
            {listing.name} · {listing.qty} × {money(listing.price)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div
            role="alert"
            className="flex flex-col gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <p className="font-semibold">Hati-hati: ini menulis ulang angka uang.</p>
            <ul className="list-disc pl-4">
              <li>
                Modal baris ini adalah salinan harga beli saat transaksi, bukan angka bebas.
                Menimpanya mengubah laba catatan ini — dan hanya catatan ini.
              </li>
              <li>
                <span className="font-semibold">Stok tidak ikut diperbaiki.</span> Lot yang dipakai
                baris ini tetap membawa modal lamanya, jadi penjualan berikutnya masih mewarisi
                angka yang sama salahnya.
              </li>
              <li>
                Angka lama tidak bisa dikembalikan dari layar ini; hanya bisa ditulis ulang lewat
                pintu ini lagi.
              </li>
              <li>Alasan dan nama Anda dicatat di catatan catatan ini.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <span>Modal sekarang</span>
            <span className="text-base font-semibold tabular-nums">{money(listing.capital)}</span>
          </div>

          <label className="flex flex-col gap-1">
            <span>Modal baru</span>
            <InputCurrency
              value={capital}
              onValueChange={setCapital}
              disabled={loading}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </label>

          <p className={believable ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
            {believable
              ? `Laba baris ini menjadi ${money(laba)} (harga jual ${money(listing.price)} − modal ${money(capital)}, × ${listing.qty}).`
              : `Laporan hanya percaya modal yang di atas nol dan di bawah harga jual, jadi dengan angka ini laba baris tetap dibaca — (tidak diketahui).`}
          </p>

          <label className="flex flex-col gap-1">
            <span>Alasan</span>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.currentTarget.value)}
              rows={2}
              disabled={loading}
              placeholder="mis. salah input waktu beli, 2.327.000 harusnya 58.950"
            />
          </label>

          <TextError>{error}</TextError>

          <div className="flex items-center justify-end gap-2">
            <Button asChild variant="outline" disabled={loading}>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void save()}
              disabled={loading || reason.trim() === ""}
            >
              Ya, ubah modal <Spinner when={loading} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
