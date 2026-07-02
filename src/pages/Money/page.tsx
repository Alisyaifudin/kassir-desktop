import { Effect } from "effect";
import { newPocket } from "./z-NewPocket";
import { MoneyService } from "~/services/money";
import { StateWrap } from "~/components/StateWrap";
import { navList } from "./z-NavList";
import { TextError } from "~/components/TextError";
import { Loading } from "./z-Loading";

const page = Effect.gen(function* () {
  const moneyService = yield* MoneyService;
  const loader = () => moneyService.pocket.loader();
  const NewPocket = yield* newPocket;
  const NavList = yield* navList;
  return function Page() {
    return (
      <main className="flex flex-col gap-2 w-full px-0.5 mx-auto flex-1 overflow-hidden">
        <div className="flex items-center justify-between py-1 pr-1">
          <h1 className="text-big font-bold">Catatan Keuangan</h1>
          <NewPocket />
        </div>
        <StateWrap
          loader={loader}
          error={({ e }) => <TextError>{e.message}</TextError>}
          loading={<Loading />}
        >
          <NavList />
        </StateWrap>
      </main>
    );
  };
});

export default page;
