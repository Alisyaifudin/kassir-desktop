import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useProduct } from "./use-product-download";

export function ProductDownload() {
  const { loading, error, handleSubmit } = useProduct();
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center justify-between p-2 ">
      <input type="hidden" name="action" value="product"></input>
      <h3 className="italic text-normal font-bold">Produk</h3>
      <Button>
        Unduh
        <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </form>
  );
}
