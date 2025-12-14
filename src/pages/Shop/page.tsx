import { Right } from "./Right";
import { Left } from "./Left";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { useInitTx } from "./use-transaction";
import { TextError } from "~/components/TextError";
import { LoadingBig } from "~/components/Loading";

export default function Page() {
  const { product, customers, methods, transaction, products, extras, tabs } =
    useLoaderData<Loader>();
  const [error, loading] = useInitTx(tabs, transaction);
  if (error) {
    return <TextError>{error}</TextError>;
  }
  if (loading) return <LoadingBig />;
  return (
    <main className="flex flex-col min-h-0 h-full overflow-hidden grow shrink basis-0 relative">
      <div className="gap-2 pt-1 flex h-full">
        <Left customers={customers} methods={methods} product={product} />
        <Right tabs={tabs} products={products} extras={extras} />
      </div>
    </main>
  );
}
