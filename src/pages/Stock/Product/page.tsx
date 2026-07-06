import { ErrorComponent } from "~/components/ErrorComponent";
import { ProductPanel } from "./z-ProductPanel";
import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { ProductService } from "~/services/product";
import { WithLoader } from "~/components/WithLoader";
import { ProductTable } from "./z-ProductTable";
import { UserService } from "~/services/user";

export const page = Effect.gen(function* () {
  const userService = yield* UserService;
  const productService = yield* ProductService;
  const getAll = () => productService.get.all();
  const useUser = () => userService.useUser();
  return function Page() {
    return (
      <>
        <ProductPanel useUser={useUser} />
        <WithLoader
          loader={getAll}
          loading={<Loading />}
          error={(e, retry) => (
            <ErrorComponent status={500}>
              <button onClick={retry}>Coba lagi</button>
              {e.e.message}
            </ErrorComponent>
          )}
        >
          {(products) => <ProductTable products={products} />}
        </WithLoader>
      </>
    );
  };
});

export default page;
