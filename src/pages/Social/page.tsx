import { Effect } from "effect";
import { SocialService } from "~/services/social";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { SocialList } from "./z-SocialList";
import { NewSocial } from "./z-NewSocial";
import { Loading } from "./z-Loading";
import { promisify } from "~/lib/promisify";
import { cn } from "~/lib/utils";

const page = Effect.gen(function* () {
  const socialService = yield* SocialService;

  const onAdd = (name: string, value: string) =>
    promisify(
      () => socialService.add(name, value),
      (e) => e.e.message,
    );
  const onUpdate = (id: string, name: string, value: string) =>
    promisify(
      () => socialService.update({ id, name, value }),
      (e) => e.e.message,
    );
  const onDelete = (id: string) =>
    promisify(
      () => socialService.delete(id),
      (e) => e.e.message,
    );

  return function Page() {
    return (
      <div className="flex flex-col gap-4 p-6 w-full flex-1 overflow-hidden">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Kontak Media Sosial</h1>
          <p className="text-muted-foreground text-normal">
            Kelola kontak yang muncul di struk transaksi
          </p>
        </div>
        <div
          className={cn(
            "grid gap-2 items-center text-normal",
            "grid-cols-[250px_1fr] small:grid-cols-[200px_1fr]",
          )}
        >
          <p className="font-semibold text-foreground">Kontak</p>
          <p className="font-semibold text-foreground">Isian</p>
        </div>
        <StateWrap
          loader={socialService.loader}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <SocialList
            useSocials={socialService.useSocials}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
          <NewSocial onAdd={onAdd} />
        </StateWrap>
      </div>
    );
  };
});

export default page;
