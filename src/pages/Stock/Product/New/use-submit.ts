import { Effect } from "effect";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { db } from "~/database-effect";
import { log } from "~/lib/log";
import { useAppForm } from "../z-ProductForm";
import { createProductOptions } from "../util-product-options";
import { useBackUrl } from "~/hooks/use-back-url";
import { revalidateProducts } from "../../../../hooks/use-get-products";

export function useSubmit() {
  const [error, setError] = useState<null | string>(null);
  const navigate = useNavigate();
  const backUrl = useBackUrl("/stock");
  const options = useRef(
    createProductOptions({
      onError(error) {
        setError(error);
      },
      onSuccess() {
        setError(null);
        navigate(backUrl);
        revalidateProducts();
      },
      program,
    }),
  );
  const form = useAppForm(options.current);
  return { error, form };
}

type Input = {
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  capital: number;
  note: string;
};

function program(product: Input) {
  return db.product.add(product).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
    Effect.catchTag("DuplicateError", (e) => {
      return Effect.succeed("Barang dengan kode ini sudah ada: " + e.name);
    }),
  );
}
