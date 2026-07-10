import { Search } from "./z-Search";
import { Manual } from "./z-Manual";
import { Product } from "~/services/product";
import { useCallback, useMemo } from "react";

type Props = {
  useProducts: () => Product[];
  useManual: () => {
    codes: string[];
    name: string;
    qty: number;
    price: number;
  };
  set: {
    code: {
      edit: (i: number, code: string) => void;
      add: () => void;
      remove: (i: number) => void;
    };
    name: (name: string) => void;
    qty: (qty: number) => void;
    price: (price: number) => void;
  };
  onSubmit: (product: Product) => void;
};

export function InputSection({ useProducts, onSubmit, set, useManual }: Props) {
  const products = useProducts();
  const codeToProductName = useMemo(
    () => new Map(products.flatMap((product) => product.codes.map((c) => [c, product.name]))),
    [products],
  );
  const handleSelect = useCallback(
    (product: Product) => {
      onSubmit(product);
    },
    [onSubmit],
  );
  const handleManualInput = useCallback(
    (product: Product) => {
      const errors: string[] = [];
      let hasDuplicate = false;
      for (const code of product.codes) {
        const productName = codeToProductName.get(code);
        if (productName === undefined) {
          errors.push("");
          continue;
        }
        hasDuplicate = true;
        errors.push(`Duplikat dengan ${productName}`);
      }
      if (!hasDuplicate) onSubmit(product);
      return errors;
    },
    [onSubmit, codeToProductName],
  );
  return (
    <div className="flex flex-col gap-1">
      <Search onSelect={handleSelect} products={products} />
      <hr />
      <Manual onSubmit={handleManualInput} set={set} useManual={useManual} />
    </div>
  );
}
