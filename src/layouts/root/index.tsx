import { Outlet } from "react-router";
import { store } from "~/store";
import { Provider } from "./Provider";
import { Result } from "~/lib/result";
import { Skeleton } from "~/components/ui/skeleton";

export default function Layout() {
  const res = Result.use({
    fn: () => store.size.get(),
    key: "root-layout",
  });
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onSuccess(size) {
      return (
        <Provider size={size}>
          <Outlet />
        </Provider>
      );
    },
  });
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
