import { useState } from "react";
import { useNavigate } from "react-router";
import { Either } from "effect";
import Redirect from "~/components/Redirect";
import { useMutation } from "~/components/Loader";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import type { ProductInput } from "~/services/product";
import { ProductForm } from "../Form/ProductForm";

export default function Page() {
  const role = useUser().role;
  const navigate = useNavigate();
  const { pending, mutate } = useMutation(service.product.add);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCode, setDuplicateCode] = useState<string | null>(null);

  if (role !== "admin") return <Redirect to="/products" />;

  async function handleSubmit(input: ProductInput) {
    setError(null);
    setDuplicateCode(null);
    const either = await mutate(input);
    if (Either.isRight(either)) {
      navigate(`/products/${either.right}`, { replace: true });
      return;
    }
    if (either.left._tag === "ProductDuplicateCode") setDuplicateCode(either.left.value);
    else setError(either.left.message);
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-64px)] w-full max-w-3xl flex-col overflow-y-auto px-4 py-4 small:h-[calc(100vh-48px)]">
      <h1 className="mb-4 text-big font-bold text-foreground">Tambah Produk</h1>
      <ProductForm
        pending={pending}
        error={error}
        duplicateCode={duplicateCode}
        onSubmit={(input) => void handleSubmit(input)}
        onCancel={() => navigate("/products")}
      />
    </main>
  );
}
