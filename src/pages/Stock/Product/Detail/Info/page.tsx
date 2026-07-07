import { Effect } from "effect";
import { ProductService } from "~/services/product";
import { UserService } from "~/services/user";
import { WithLoader } from "~/components/WithLoader";
import { ErrorComponent } from "~/components/ErrorComponent";
import { NotFound } from "~/components/NotFound";
import { promisify } from "~/lib/promisify";
import { useId } from "../use-id";
import { Loading } from "./z-Loading";
import { UserInfo } from "./z-UserInfo";
import { ProductForm } from "./z-ProductForm";
import { HistoryList } from "./z-HistoryList";

const page = Effect.gen(function* () {
  const productService = yield* ProductService;
  const userService = yield* UserService;

  const onUpdate = (id: string, product: Parameters<typeof productService.update.info>[1]) =>
    promisify(
      () => productService.update.info(id, product),
      (e) => {
        if (e._tag === "ProductError") return e.e.message;
        return `Kode "${e.inserted.code}" sudah dipakai oleh "${e.existing.name}"`;
      },
    );

  const onDelete = (id: string) =>
    promisify(
      () => productService.delete(id),
      (e) => e.e.message,
    );

  const useUser = () => userService.useUser();

  return function Page() {
    const id = useId();
    const role = useUser().role;

    return (
      <div className="grid grid-cols-2 gap-2 flex-1 overflow-hidden">
        <div>
          <WithLoader
            loader={() => productService.get.byId(id)}
            loading={<Loading />}
            error={(error, retry) => {
              if (error._tag === "NotFoundError") {
                return <NotFound />;
              }
              return (
                <ErrorComponent status={500}>
                  {error.e.message}
                  <button onClick={retry}>Coba lagi</button>
                </ErrorComponent>
              );
            }}
          >
            {(product) =>
              role === "admin" ? (
                <ProductForm
                  product={product}
                  onUpdate={(p) => onUpdate(product.id, p)}
                  onDelete={() => onDelete(product.id)}
                />
              ) : (
                <UserInfo product={product} />
              )
            }
          </WithLoader>
        </div>
        <div>
          <WithLoader
            loader={() => productService.get.events(id)}
            loading={<Loading />}
            error={(error, retry) => {
              return (
                <ErrorComponent status={500}>
                  {error.e.message}
                  <button onClick={retry}>Coba lagi</button>
                </ErrorComponent>
              );
            }}
          >
            {(events) => <HistoryList events={events} />}
          </WithLoader>
        </div>
      </div>
    );
  };
});

export default page;
