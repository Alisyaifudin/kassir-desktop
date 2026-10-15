import { useMemo } from "react";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { RecordListing } from "~/services/record";
import type { Product } from "~/services/product";
import { useLinkListing } from "./use-link";
import { useListingSearch, type ListingChoice } from "./use-search";

export function Picker({ listing, products }: { listing: RecordListing; products: Product[] }) {
  const linked = useMemo(
    () =>
      products
        .flatMap((product) =>
          product.listings.map((catalogListing) => ({
            productId: product.id,
            productName: product.name,
            stock: product.stock,
            listing: catalogListing,
          })),
        )
        .find((choice) => choice.listing.id === listing.listingId),
    [listing.listingId, products],
  );
  const { query, handleChange, shown } = useListingSearch(products);
  const { choose, error, loading } = useLinkListing(listing.id, listing.listingId);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-normal">Hubungkan dengan listing</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <p>Baris:</p>
          <p>{listing.name}</p>
          <p>Rp{listing.price.toLocaleString("id-ID")}</p>
        </div>
        <div className="flex items-center gap-4">
          <p>Listing terhubung:</p>
          <Show value={linked} fallback={<p>--Kosong--</p>}>
            {(choice) => <LinkedListing choice={choice} />}
          </Show>
          <Spinner when={loading} />
        </div>
      </div>
      <Input
        type="search"
        placeholder="Cari nama, varian, atau barcode…"
        value={query}
        onChange={handleChange}
        aria-autocomplete="list"
      />
      <TextError>{error}</TextError>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="text-normal">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">No</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Listing</TableHead>
              <TableHead className="w-[200px]">Barcode / QR</TableHead>
              <TableHead className="text-right">Harga</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <ForEach items={shown.slice(0, 20)}>
              {(choice, index) => (
                <TableRow key={choice.listing.id}>
                  <TableCell>
                    <Button
                      onClick={() => void choose(choice.listing.id)}
                      disabled={loading}
                      className="w-full p-1"
                      variant={listing.listingId === choice.listing.id ? "secondary" : "default"}
                    >
                      {index + 1}
                    </Button>
                  </TableCell>
                  <TableCell>{choice.productName}</TableCell>
                  <TableCell>{choice.listing.name}</TableCell>
                  <TableCell>{choice.listing.code ?? ""}</TableCell>
                  <TableCell className="text-right">
                    {choice.listing.price.toLocaleString("id-ID")}
                  </TableCell>
                </TableRow>
              )}
            </ForEach>
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function LinkedListing({ choice }: { choice: ListingChoice }) {
  return (
    <div className="flex gap-4 items-center">
      <p>{choice.productName}</p>
      <p>{choice.listing.name}</p>
      {choice.listing.code ? <p>{choice.listing.code}</p> : null}
      <p>Rp{choice.listing.price.toLocaleString("id-ID")}</p>
    </div>
  );
}
