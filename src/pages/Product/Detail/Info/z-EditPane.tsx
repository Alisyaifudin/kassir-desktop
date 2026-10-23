import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Effect } from "effect";
import { Redo2, Undo2 } from "lucide-react";
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
  Stock,
} from "~/services/product";
import { draftFromProduct, parseNumber, toListingInput } from "../../Form/types";
import { useProductForm } from "../../Form/useProductForm";
import { InfoFields } from "../../Form/z-InfoFields";
import { ListingsFields } from "../../Form/z-ListingsFields";
import { ProductNamesFields } from "../../Form/z-ProductNamesFields";
import { PropertiesFields } from "../../Form/z-PropertiesFields";
import { StocksFields } from "../../Form/z-StocksFields";
import { ConfirmDelete } from "../z-ConfirmDelete";
import { StockAdjust } from "./z-StockAdjust";

type Op = Effect.Effect<unknown, ProductError | ProductDuplicateCode>;

function listingChanged(original: Listing, input: ListingInput): boolean {
  return (
    original.name !== input.name ||
    original.price !== input.price ||
    original.unit !== input.unit ||
    original.kind !== input.kind ||
    original.code !== input.code
  );
}

export function EditPane({ product }: { product: ProductFull }) {
  const form = useProductForm(draftFromProduct(product));
  const navigate = useNavigate();
  const backUrl = useGetUrlBack("/products");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adjustLot, setAdjustLot] = useState<Stock | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { undo, redo, canUndo, canRedo } = form;
  const busy = pending || deleting;

  const lockedStockKeys = useMemo(
    () => new Set(product.stocks.map((stock) => stock.id)),
    [product.stocks],
  );

  // Stock adjustments save immediately, so keep the persisted lots' quantities
  // in the draft in sync (capital and unsaved lots are left alone).
  const syncStockValues = form.syncStockValues;
  useEffect(() => {
    syncStockValues(product.stocks);
  }, [product.stocks, syncStockValues]);

  // Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y) drive the form history. A dialog owns its
  // own inputs, and a save in flight is not undoable, so stand down for both.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey || busy || confirmOpen || adjustLot !== null) return;
      const key = event.key.toLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo = (key === "z" && event.shiftKey) || key === "y";
      if (!wantsUndo && !wantsRedo) return;
      event.preventDefault();
      if (wantsUndo) undo();
      else redo();
    }
    document.body.addEventListener("keydown", handleKeyDown);
    return () => document.body.removeEventListener("keydown", handleKeyDown);
  }, [busy, confirmOpen, adjustLot, undo, redo]);

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

    const originalProductNameIds = new Set(product.productNames.map((name) => name.id));
    const draftProductNameKeys = new Set(draft.productNames.map((name) => name.key));
    for (const productName of draft.productNames) {
      const input = { value: productName.value.trim() };
      if (originalProductNameIds.has(productName.key)) {
        const original = product.productNames.find((item) => item.id === productName.key);
        if (original !== undefined && original.value !== input.value) {
          ops.push(service.product.set.productName.update(product.id, productName.key, input));
        }
      } else {
        ops.push(service.product.set.productName.add(product.id, input));
      }
    }
    for (const productName of product.productNames) {
      if (!draftProductNameKeys.has(productName.id)) {
        ops.push(service.product.set.productName.remove(product.id, productName.id));
      }
    }

    const originalStockIds = new Set(product.stocks.map((stock) => stock.id));
    for (const stock of draft.stocks) {
      const capital = parseNumber(stock.capital);
      if (originalStockIds.has(stock.key)) {
        const original = product.stocks.find((item) => item.id === stock.key);
        // Quantity is edited through the adjust dialog (saved immediately), so
        // Simpan only carries capital changes and must not clobber the lot's
        // current value with a stale draft value.
        if (original !== undefined && original.capital !== capital) {
          ops.push(
            service.product.stock.adjust(product.id, stock.key, {
              value: original.value,
              capital,
            }),
          );
        }
      } else {
        const value = Math.max(0, Math.round(parseNumber(stock.value)));
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

  return (
    <div className="flex flex-col gap-4">
      <InfoFields form={form} disabled={busy} />
      <ProductNamesFields form={form} disabled={busy} />
      <ListingsFields form={form} disabled={busy} />
      <StocksFields
        form={form}
        disabled={busy}
        lockedKeys={lockedStockKeys}
        onAdjustValue={(stock) => {
          const lot = product.stocks.find((item) => item.id === stock.key);
          if (lot !== undefined) setAdjustLot(lot);
        }}
      />
      <PropertiesFields form={form} disabled={busy} />
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
        <div className="flex items-stretch gap-2">
          <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-background shadow-sm">
            <HistoryButton
              label="Urungkan"
              hint="Ctrl+Z"
              disabled={busy || !canUndo}
              onClick={undo}
              icon={<Undo2 className="icon" />}
            />
            <span className="w-px self-stretch bg-border" aria-hidden />
            <HistoryButton
              label="Ulangi"
              hint="Ctrl+Shift+Z"
              disabled={busy || !canRedo}
              onClick={redo}
              icon={<Redo2 className="icon" />}
            />
          </div>
          <Button type="button" onClick={() => void handleSave()} disabled={busy}>
            Simpan
            <Spinner when={pending} />
          </Button>
        </div>
      </div>
      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus produk?"
        description={`"${product.name}" akan dihapus dan tidak muncul lagi di daftar produk.`}
        onConfirm={performDelete}
      />
      {adjustLot !== null ? (
        <StockAdjust product={product} lot={adjustLot} onClose={() => setAdjustLot(null)} />
      ) : null}
    </div>
  );
}

/** One half of the undo/redo pair. Icon-only, so the label and shortcut live in
 *  `aria-label`/`title` rather than the markup. */
function HistoryButton({
  label,
  hint,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={`${label} (${hint})`}
      onClick={onClick}
      className="flex items-center px-3 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      {icon}
    </button>
  );
}
