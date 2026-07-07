import { useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { ProductForm as FormLayout, useAppForm } from "../../New/z-ProductForm";
import { createProductOptions, type Product } from "../../New/util-product-options";
import { DeleteBtn } from "./z-DeleteBtn";

type Props = {
  product: Product;
  onUpdate: (product: Product) => Promise<string | null>;
  onDelete: () => Promise<string | null>;
};

export function ProductForm({ product, onUpdate, onDelete }: Props) {
  const [error, setError] = useState<null | string>(null);
  const options = useRef(
    createProductOptions({
      product,
      onSubmit: onUpdate,
      onError: setError,
      onSuccess: () => setError(null),
    }),
  );
  const form = useAppForm(options.current);

  return (
    <div className="h-full overflow-hidden">
      <FormLayout form={form}>
        <>
          <div className="flex items-center justify-between">
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button className="w-fit" type="submit">
                  Simpan
                  <Spinner when={isSubmitting} />
                </Button>
              )}
            </form.Subscribe>
            <DeleteBtn name={product.name} onDelete={onDelete} />
          </div>
          <TextError>{error}</TextError>
        </>
      </FormLayout>
    </div>
  );
}
