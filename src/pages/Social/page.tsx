import { Effect } from "effect";
import { SocialService } from "~/services/social";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { socialListEffect } from "./effect-socialList";
import { newSocialEffect } from "./effect-newSocial";
import { Loading } from "./z-Loading";
import { cn } from "~/lib/utils";

const page = Effect.gen(function* () {
  const socialService = yield* SocialService;
  const useLoad = socialService.useLoad;
  const SocialList = yield* socialListEffect;
  const NewSocial = yield* newSocialEffect;
  return function Page() {
    const status = useLoad();
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
          status={status}
          loading={<Loading />}
          error={({ e }) => <TextError>{e.message}</TextError>}
        >
          <SocialList />
          <NewSocial />
        </StateWrap>
      </div>
    );
  };
});

export default page;
