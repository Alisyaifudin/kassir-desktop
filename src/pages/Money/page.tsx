import { Effect } from "effect";
import { PocketService } from "~/services/pocket";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { Loading } from "./z-Loading";
import { NavList } from "./z-NavList";
import { NewPocket } from "./z-NewPocket";
import { promisify } from "~/lib/promisify";

const page = Effect.gen(function* () {
  const pocketService = yield* PocketService;

  const onAdd = (name: string) =>
    promisify(
      () => pocketService.add(name),
      (e) => e.e.message,
    );

  const onReorder = (pockets: { id: string }[]) =>
    pocketService.set.ordering(pockets.map((p) => p.id));

  return function Page() {
    return (
      <main className="flex flex-col gap-2 w-full px-0.5 mx-auto flex-1 overflow-hidden">
        <div className="flex items-center justify-between py-1 pr-1">
          <h1 className="text-big font-bold">Catatan Keuangan</h1>
          <NewPocket onAdd={onAdd} />
        </div>
        <StateWrap
          loader={pocketService.loader}
          error={({ e }) => <TextError>{e.message}</TextError>}
          loading={<Loading />}
        >
          <NavList
            usePockets={pocketService.usePockets}
            onReorder={onReorder}
          />
        </StateWrap>
      </main>
    );
  };
});

export default page;
