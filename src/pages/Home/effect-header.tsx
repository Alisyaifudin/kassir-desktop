import { Effect } from "effect";
import { capitalize } from "~/lib/capitalize";
import { CashierService } from "~/services/cashier";

export const header = Effect.gen(function*() {
  const cashierService = yield* CashierService;
  const useUser = cashierService.current.useUser
  return function Header() {
  const user = useUser();
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-1 mb-8">
      <h1 className="text-big font-bold tracking-tight">
        Selamat Datang, {capitalize(user.name)}!
      </h1>
      <p className="text-muted-foreground">{today}</p>
    </div>
  );
}
 
})
