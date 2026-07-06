import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { ProductForm, useAppForm } from "./z-ProductForm";
import { createProductOptions, type Product } from "./util-product-options";

type Props = {
  onSubmit: (product: Product) => Promise<string | null>;
};

export function NewProductForm({ onSubmit }: Props) {
  const [error, setError] = useState<null | string>(null);
  const navigate = useNavigate();
  const backUrl = useGetUrlBack("/stock");
  const options = useRef(
    createProductOptions({
      onSubmit,
      onError(err) {
        setError(err);
      },
      onSuccess() {
        setError(null);
        navigate(backUrl);
      },
    }),
  );
  const form = useAppForm(options.current);

  return (
    <ProductForm form={form}>
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
        </div>
        <TextError>{error}</TextError>
      </>
    </ProductForm>
  );
}
