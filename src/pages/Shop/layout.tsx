import { useShortcut } from "./use-shortcut";
import { Outlet } from "react-router";
import { useGetTabs } from "./use-tabs";
import { Result } from "~/lib/result";
import { LoadingBig } from "~/components/Loading";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";

export default function Layout() {
  useShortcut();
  const res = useGetTabs();
  return Result.match(res, {
    onLoading() {
      return <LoadingBig />;
    },
    onError(error) {
      switch (error._tag) {
        case "TooMany":
          log.error(error.msg);
          return <ErrorComponent>Aplikasi bermasalah</ErrorComponent>;
        case "TxError":
          log.error(error.e);
          return <ErrorComponent>{error.e.message}</ErrorComponent>;
      }
    },
    onSuccess(tabs) {
      return <Outlet context={{ tabs }} />;
    },
  });
}
