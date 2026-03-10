import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { Product } from "~/database/product/get-by-id";
import { useUpdate } from "./use-update";
import { ProductForm as ProductFormRoot } from "../../../z-ProductForm";
import { DeleteBtn } from "./z-DeleteBtn";

export function ProductForm({ product }: { product: Product }) {
  const { form, error } = useUpdate(product);
  return (
    <div className="h-full overflow-hidden">
      <ProductFormRoot form={form}>
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
            <DeleteBtn name={product.name} />
          </div>
          <TextError>{error}</TextError>
        </>
      </ProductFormRoot>
    </div>
  );
}
