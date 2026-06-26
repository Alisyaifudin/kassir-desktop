import { Outlet } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import { LoaderClass, WithLoader } from "~/components/Loader";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Effect } from "effect";
import { StoreService } from "~/services/store";

const layout = Effect.gen(function* () {
  const store = yield* StoreService;
  const loader = new LoaderClass(store.size.get);
  return function Layout() {
    return (
      <WithLoader
        loader={loader}
        loading={<Loading />}
        error={({ e }) => <ErrorComponent>{e.message}</ErrorComponent>}
      >
        {() => <Outlet />}
      </WithLoader>
    );
  };
});

function Loading() {
  return (
    <div className="max-h-screen max-w-screen flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <Skeleton className="h-10 w-48" />
      <div className="w-full max-w-3xl grid grid-cols-2 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-10 w-full max-w-3xl" />
    </div>
  );
}

export default layout;
