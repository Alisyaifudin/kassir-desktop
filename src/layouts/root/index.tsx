import { Outlet } from "react-router";
import { LoadingFull } from "~/components/Loading";
import { store } from "~/store-effect";
import { Provider } from "./Provider";
import { Result } from "~/lib/result";

export default function Layout() {
  const res = Result.use({
    fn: () => store.size.get(),
    key: "root-layout",
  });
  return Result.match(res, {
    onLoading() {
      return <LoadingFull />;
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
