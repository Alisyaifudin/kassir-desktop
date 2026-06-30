import { infoEffect } from "./effect-info";
import { TextError } from "~/components/TextError";
import { StateWrap } from "~/components/StateWrap";
import { Effect } from "effect";
import { InfoService } from "~/services/info";
import { Loading } from "./z-Loading";
import { cashierCheckbox } from "./effect-cashierCheckbox";

const page = Effect.gen(function* () {
  const infoService = yield* InfoService;
  const useLoad = infoService.useLoad;
  const Info = yield* infoEffect;
  const CashierCheckbox = yield* cashierCheckbox;
  return function Page() {
    const status = useLoad();
    return (
      <div className="flex flex-col gap-6 p-6 flex-1 w-full overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Pengaturan Toko</h1>
          <p className="text-muted-foreground text-normal">Kelola identitas dan preferensi toko</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <StateWrap
            status={status}
            loading={<Loading />}
            error={({ e }) => <TextError>{e.message}</TextError>}
          >
            <Info />
            <CashierCheckbox />
          </StateWrap>
        </div>
      </div>
    );
  };
});

export default page;
