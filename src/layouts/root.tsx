import { Outlet } from "react-router";
import { store } from "~/store";
import { Skeleton } from "~/components/ui/skeleton";
import { LoaderClass, WithLoader } from "~/components/WithLoader";
import { ErrorComponent } from "~/components/ErrorComponent";

const loader = new LoaderClass(store.size.get());

export default function Layout() {
  return (
    <WithLoader
      loader={loader}
      loading={<Loading />}
      error={({ e }) => <ErrorComponent>{e.message}</ErrorComponent>}
    >
      <Outlet />
    </WithLoader>
  );
}

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
