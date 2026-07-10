import { useShortcut } from "./use-shortcut";
import { Outlet } from "react-router";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Loading } from "./z-Loading";
import { Effect } from "effect";
import { TransactionService } from "~/services/transaction";
import { StateWrap } from "~/components/StateWrap";

const layout = Effect.gen(function* () {
  const txService = yield* TransactionService;
  const loader = () => txService.loader("out");
  return function Layout() {
    useShortcut();
    return (
      <StateWrap
        loader={loader}
        loading={<Loading />}
        error={({ e }) => <ErrorComponent>{e.message}</ErrorComponent>}
      >
        <Outlet />
      </StateWrap>
    );
  };
});

export default layout;
