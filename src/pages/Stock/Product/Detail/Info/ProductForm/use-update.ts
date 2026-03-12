import { Effect } from "effect";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { db } from "~/database-effect";
import { Product } from "~/database-effect/product/get-by-id";
import { log } from "~/lib/log";
import { useAppForm } from "../../../z-ProductForm";
import { createProductOptions } from "../../../util-product-options";
import { useBackUrl } from "~/hooks/use-back-url";
import { revalidateProducts } from "../../../../../../hooks/use-get-products";

export function useUpdate(product: Product) {
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
      product,
      program: (p) => program({ ...p, id: product.id }),
    }),
  );
  const form = useAppForm(options.current);
  return { form, error };
}

function program(product: Product) {
  return db.product.update.info(product).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
    Effect.catchTag("DuplicateError", (e) => {
      return Effect.succeed("Barang dengan kode tersebut sudah ada: " + e.name);
    }),
  );
}
