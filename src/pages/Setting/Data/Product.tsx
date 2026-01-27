import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { constructCSV, log } from "~/lib/utils";
import { useSubmit } from "~/hooks/use-submit";
import { Effect, pipe } from "effect";
import { db } from "~/database-effect";
import { Temporal } from "temporal-polyfill";

export function Product() {
  const { error, loading, handleSubmit } = useSubmit(
    () => pipe(program(), Effect.either, Effect.runPromise),
    (res) => {
      const blob = new Blob([res.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.name;
      a.click();
      URL.revokeObjectURL(url);
    },
  );
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center justify-between p-2 bg-sky-50">
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

function program() {
  return Effect.gen(function* () {
    const products = yield* db.product.get.all().pipe(
      Effect.catchTag("DbError", ({ e }) => {
        log.error(JSON.stringify(e.stack));
        return Effect.fail(e.message);
      }),
    );
    const csv = constructCSV(products);
    const today = Temporal.Now.instant();
    const name = `products_${today.epochMilliseconds}.csv`;
    return { csv, name };
  });
}
