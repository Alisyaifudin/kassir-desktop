import { Effect } from "effect";
import { MoneyService } from "~/services/money";
import { newRecord } from "./effect-newRecord";
import { nameForm } from "./effect-nameForm";

export const header = Effect.gen(function* () {
  const moneyService = yield* MoneyService;
  const usePocket = () => moneyService.money.usePocket();
  const NewRecord = yield* newRecord;
  const Name = yield* nameForm;
  return function Header() {
    const pocket = usePocket();
    return (
      <header className="flex items-center justify-between">
        <Name name={pocket.name} pocketId={pocket.id} />
        <div className="flex items-center gap-3">
          <NewRecord pocket={pocket} />
        </div>
      </header>
    );
  };
});
