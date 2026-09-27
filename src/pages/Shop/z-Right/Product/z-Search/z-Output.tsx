import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "~/lib/utils";
import { Product } from "~/database/product/cache";
import { FuzzyResult } from "@nozbe/microfuzz";
import { Kbd } from "~/components/ui/kdb";
import { ProductCard } from "./z-ProductCard";

const MAX_RESULTS = 20;
const PORTAL_ID = "output-portal";

/**
 * Search results overlay.
 *
 * The DOM is portaled into the `#output-portal` element on the Shop page so it
 * can cover the whole screen while still being rendered from within the search
 * subtree (React context, handlers and the anchor ref all keep working).
 *
 * It is positioned `fixed` with its top edge pinned to the bottom of the search
 * input (`anchorRef`) so it always sits "just below the search bar", and it
 * extends to the bottom edge of the viewport at full width.
 *
 * It only opens when the input has a non-empty query AND is focused.
 */
export function Output({
  products,
  handleClickProduct,
  anchorRef,
  query,
}: {
  products: FuzzyResult<Product>[];
  handleClickProduct: (product: Product) => void;
  anchorRef?: React.RefObject<HTMLInputElement | null>;
  query: string;
}) {
  const list = useMemo(() => products.slice(0, MAX_RESULTS), [products]);
  // First result is selected by default.
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const listRef = useRef<HTMLOListElement>(null);
  const target = usePortalTarget(PORTAL_ID);
  const top = useAnchorTop(anchorRef);
  const focused = useFocused(anchorRef);

  const open = query.trim() !== "" && focused && list.length > 0;

  // Keep the latest handler without re-subscribing the key listener.
  const selectRef = useRef(handleClickProduct);
  useEffect(() => {
    selectRef.current = handleClickProduct;
  });

  // Re-select the first result whenever the result set changes.
  useEffect(() => {
    setActiveIndex(list.length > 0 ? 0 : null);
  }, [list]);

  // Arrow-key navigation; Enter picks the highlighted product.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i === null ? 0 : (i + 1) % list.length));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) =>
            i === null ? list.length - 1 : (i - 1 + list.length) % list.length,
          );
          break;
        case "Enter":
          // Default row (0) / no highlight: let the form handle it so an exact
          // barcode or the first match is resolved by the existing submit logic.
          if (activeIndex === null || activeIndex === 0) return;
          e.preventDefault();
          selectRef.current(list[activeIndex].item);
          break;
        case "Escape":
          setActiveIndex(null);
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, list, activeIndex]);

  // Keep the highlighted row in view while navigating.
  useEffect(() => {
    if (activeIndex === null) return;
    const row = listRef.current?.children[activeIndex];
    if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open || !target || top === null) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex flex-col ",
        "border-t bg-background/95 shadow-[0_-8px_32px_rgba(0,0,0,0.15)] backdrop-blur-sm",
      )}
      style={{ top }}
    >
      <div className="flex shrink-0 items-center  justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
        <span className="text-small font-semibold uppercase tracking-wide text-muted-foreground">
          {products.length} hasil
          {products.length > MAX_RESULTS ? ` · ${MAX_RESULTS} teratas` : ""}
        </span>
        <span className="flex items-center gap-1 text-tiny text-muted-foreground">
          <Kbd className="h-4 min-w-4 text-tiny">↑</Kbd>
          <Kbd className="h-4 min-w-4 text-tiny">↓</Kbd>
          pilih
          <Kbd className="h-4 text-tiny">Enter</Kbd>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ol ref={listRef} role="listbox" className="mx-auto flex w-full  flex-col p-1.5">
          {list.map((result, i) => (
            <ProductCard
              key={result.item.id}
              product={result.item}
              index={i}
              active={i === activeIndex}
              onSelect={handleClickProduct}
            />
          ))}
        </ol>
      </div>
    </div>,
    target,
  );
}

function usePortalTarget(id: string) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTarget(document.getElementById(id));
  }, [id]);
  return target;
}

function useAnchorTop(anchorRef?: React.RefObject<HTMLInputElement | null>) {
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = anchorRef?.current;
    if (!el) return;
    const update = () => setTop(el.getBoundingClientRect().bottom);
    update();
    window.addEventListener("resize", update);
    // capture: also react to scrolling inside the product list container
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef]);
  return top;
}

function useFocused(anchorRef?: React.RefObject<HTMLInputElement | null>) {
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const el = anchorRef?.current;
    if (!el) return;
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    setFocused(document.activeElement === el);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, [anchorRef]);
  return focused;
}
