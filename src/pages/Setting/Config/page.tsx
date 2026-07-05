import { Effect } from "effect";
import { SelectSize } from "./z-SelectSize";
import { SelectTheme } from "./z-SelectTheme";
import { Separator } from "~/components/ui/separator";
import { ConfigService } from "~/services/config";

export const page = Effect.gen(function* () {
  const config = yield* ConfigService;

  return function Page() {
    return (
      <div className="flex flex-col gap-6 p-6 flex-1 w-full overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Konfigurasi</h1>
          <p className="text-muted-foreground text-normal">Atur konfigurasi aplikasi</p>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-primary rounded-full" />
              <h2 className="text-normal font-semibold text-foreground">Tampilan</h2>
            </div>
            <p className="text-muted-foreground text-normal mt-1 ml-3">
              Sesuaikan ukuran dan tema aplikasi
            </p>
          </div>
          <Separator />
          <div className="p-6 grid grid-cols-1 gap-8">
            <SelectSize useSize={() => config.size.useSize()} onSetSize={(s) => config.size.set(s)} />
            <SelectTheme useTheme={() => config.theme.useTheme()} onSetTheme={(t) => config.theme.set(t)} />
          </div>
        </div>
      </div>
    );
  };
});

export default page;
