import { cn } from "~/lib/utils";
import { Product } from "~/services/product";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";

function formatRupiah(n: number) {
  return n.toLocaleString("id-ID");
}

export type OutputHandle = {
  focusFirst: () => void;
};

export const Output = forwardRef<
  OutputHandle,
  {
    products: Product[];
    onClick: (product: Product) => void;
    className?: string;
  }
>(function Output({ products, onClick, className }, ref) {
  const items = products.slice(0, 20);
  const maxIndex = items.length - 1;
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLOListElement>(null);
  const activeRef = useRef(activeIndex);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useImperativeHandle(ref, () => ({
    focusFirst() {
      setActiveIndex(0);
    },
  }));

  // Reset selection when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [products]);

  // Sync activeIndex to ref (for stable keydown handler)
  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  // Focus the active button
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const btn = listRef.current.querySelectorAll("button")[activeIndex] as
      | HTMLButtonElement
      | undefined;
    btn?.focus();
  }, [activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(maxIndex);
        break;
      case "Enter":
        if (activeRef.current >= 0 && activeRef.current < items.length) {
          e.preventDefault();
          onClickRef.current(items[activeRef.current]);
        }
        break;
    }
  }

  return (
    <output
      className={cn(
        "bg-white absolute left-1 h-fit border shadow-md right-1 z-20 overflow-x-clip overflow-y-auto rounded-lg",
        "max-h-[calc(100dvh-200px)] small:max-h-[calc(100dvh-177px)] top-[150px] small:top-[125px]",
        className,
      )}
    >
      <ol ref={listRef} onKeyDown={handleKeyDown} className="flex flex-col gap-2 w-full p-1.5">
        {items.map((product, i) => (
          <li key={product.id}>
            <button
              type="button"
              onClick={() => onClick(product)}
              tabIndex={activeIndex === -1 ? (i === 0 ? 0 : -1) : i === activeIndex ? 0 : -1}
              className={cn(
                "cursor-pointer w-full text-left border rounded-lg p-3 transition-colors",
                "hover:bg-amber-100 hover:border-amber-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1",
                i % 2 === 0 ? "bg-blue-50/30" : "bg-white",
                i === activeIndex &&
                  "ring-2 ring-amber-500 ring-offset-1 outline-none bg-amber-100 border-amber-400",
              )}
            >
              {/* Header: name + price */}
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm leading-tight">{product.name}</span>
                  {product.note && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{product.note}</p>
                  )}
                </div>
                <span className="font-semibold text-sm whitespace-nowrap tabular-nums text-sky-700">
                  Rp{formatRupiah(product.price)}
                </span>
              </div>

              {/* Codes */}
              {product.codes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {product.codes.map((code) => (
                    <span
                      key={code}
                      className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono tracking-wide"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}

              {/* Capitals */}
              {product.capitals.length > 0 && (
                <>
                  <hr className="my-2.5 border-gray-200" />
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {product.capitals.map((cap) => (
                      <div
                        key={cap.id}
                        className={cn(
                          "text-xs flex items-center gap-1.5 rounded px-1.5 py-0.5 -mx-1.5",
                          cap.stock <= 0 &&
                            "bg-red-50/60 text-red-600 shadow-[0_0_6px_rgba(239,68,68,0.25)]",
                        )}
                      >
                        <span>
                          Stok <span className="font-medium tabular-nums">{cap.stock}</span>
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>
                          Modal{" "}
                          <span className="font-medium tabular-nums">
                            Rp{formatRupiah(cap.capital)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </button>
          </li>
        ))}
      </ol>
    </output>
  );
});
