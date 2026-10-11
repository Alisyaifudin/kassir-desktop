import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Effect } from "effect";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { service } from "~/services";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import type {
  Listing,
  ListingInput,
  ProductDuplicateCode,
  ProductError,
  ProductFull,
} from "~/services/product";
import { draftFromProduct, parseNumber, toListingInput } from "../../Form/types";
import { useProductForm } from "../../Form/useProductForm";
import { InfoFields } from "../../Form/z-InfoFields";
import { ListingsFields } from "../../Form/z-ListingsFields";
import { PropertiesFields } from "../../Form/z-PropertiesFields";
import { StocksFields } from "../../Form/z-StocksFields";
import { ConfirmDelete } from "../z-ConfirmDelete";
import { StockConsume } from "./z-StockConsume";

type Op = Effect.Effect<unknown, ProductError | ProductDuplicateCode>;

function listingChanged(original: Listing, input: ListingInput): boolean {
  return (
    original.name !== input.name ||
    original.price !== input.price ||
    original.unit !== input.unit ||
    original.kind !== input.kind ||
    original.code !== input.code ||
    original.codeKind !== input.codeKind
  );
}

export function EditPane({ product }: { product: ProductFull }) {
  const form = useProductForm(draftFromProduct(product));
  const navigate = useNavigate();
  const backUrl = useGetUrlBack("/products");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lockedStockKeys = useMemo(
    () => new Set(product.stocks.map((stock) => stock.id)),
    [product.stocks],
  );

  function buildOps(): Op[] {
    const { draft } = form;
    const ops: Op[] = [];
    const name = draft.name.trim();

    if (name !== product.name || draft.note !== product.note) {
      ops.push(service.product.set.info(product.id, { name, note: draft.note }));
    }

    const originalListingIds = new Set(product.listings.map((listing) => listing.id));
    const draftListingKeys = new Set(draft.listings.map((listing) => listing.key));
    for (const listing of draft.listings) {
      const input = toListingInput(listing);
      if (originalListingIds.has(listing.key)) {
        const original = product.listings.find((item) => item.id === listing.key);
        if (original !== undefined && listingChanged(original, input)) {
          ops.push(service.product.set.listing.update(product.id, listing.key, input));
        }
      } else {
        ops.push(service.product.set.listing.add(product.id, input));
      }
    }
    for (const listing of product.listings) {
      if (!draftListingKeys.has(listing.id)) {
        ops.push(service.product.set.listing.remove(product.id, listing.id));
      }
    }

    const originalPropertyIds = new Set(product.properties.map((property) => property.id));
    const draftPropertyKeys = new Set(draft.properties.map((property) => property.key));
    for (const property of draft.properties) {
      const input = { key: property.name.trim(), value: property.value };
      if (originalPropertyIds.has(property.key)) {
        const original = product.properties.find((item) => item.id === property.key);
        if (
          original !== undefined &&
          (original.key !== input.key || original.value !== input.value)
        ) {
          ops.push(service.product.set.property.update(product.id, property.key, input));
        }
      } else {
        ops.push(service.product.set.property.add(product.id, input));
      }
    }
    for (const property of product.properties) {
      if (!draftPropertyKeys.has(property.id)) {
        ops.push(service.product.set.property.remove(product.id, property.id));
      }
    }

    const originalStockIds = new Set(product.stocks.map((stock) => stock.id));
    for (const stock of draft.stocks) {
      const value = Math.max(0, Math.round(parseNumber(stock.value)));
      const capital = parseNumber(stock.capital);
      if (originalStockIds.has(stock.key)) {
        const original = product.stocks.find((item) => item.id === stock.key);
        if (original !== undefined && (original.value !== value || original.capital !== capital)) {
          ops.push(service.product.stock.adjust(product.id, stock.key, { value, capital }));
        }
      } else {
        ops.push(service.product.stock.receive(product.id, { value, capital }));
      }
    }

    return ops;
  }

  async function handleSave() {
    if (!form.validate()) return;
    const ops = buildOps();
    if (ops.length === 0) return;

    setPending(true);
    setError(null);
    const result = await Effect.runPromise(Effect.all(ops, { concurrency: 1 }).pipe(Effect.either));

    if (result._tag === "Left") {
      setError(
        result.left._tag === "ProductDuplicateCode"
          ? `Kode "${result.left.value}" sudah dipakai produk lain.`
          : result.left.message,
      );
      setPending(false);
      return;
    }

    const fresh = await Effect.runPromise(service.product.get.byId(product.id).pipe(Effect.either));
    if (fresh._tag === "Right") form.reset(draftFromProduct(fresh.right));
    setPending(false);
  }

  /** Returns an error message, or `null` on success (the dialog closes itself). */
  async function performDelete(): Promise<string | null> {
    setDeleting(true);
    const result = await Effect.runPromise(service.product.delete(product.id).pipe(Effect.either));
    setDeleting(false);
    if (result._tag === "Right") {
      navigate(backUrl);
      return null;
    }
    return result.left.message;
  }

  const busy = pending || deleting;

  return (
    <div className="flex flex-col gap-4">
      <InfoFields form={form} disabled={busy} />
      <ListingsFields form={form} disabled={busy} />
      <StocksFields form={form} disabled={busy} lockedKeys={lockedStockKeys} />
      <PropertiesFields form={form} disabled={busy} />
      <StockConsume product={product} />
      <TextError>{error}</TextError>
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
        >
          Hapus
        </Button>
        <Button type="button" onClick={() => void handleSave()} disabled={busy}>
          Simpan
          <Spinner when={pending} />
        </Button>
      </div>
      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus produk?"
        description={`"${product.name}" akan dihapus dan tidak muncul lagi di daftar produk.`}
        onConfirm={performDelete}
      />
    </div>
  );
}
