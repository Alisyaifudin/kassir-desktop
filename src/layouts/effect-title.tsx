import { TextError } from "~/components/TextError";
import { Link } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import { Effect } from "effect";
import { InfoService } from "~/services/info";
import { StateWrap } from "~/components/StateWrap";

export const title = Effect.gen(function* () {
  const info = yield* InfoService;
  return function Title() {
    const status = info.useLoad();
    return (
      <StateWrap
        status={status}
        loading={
          <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
            <Skeleton className="h-5 w-24" />
          </div>
        }
        error={(error) => <TextError>{error.e.message}</TextError>}
      >
        <TitleText useName={info.useName} />
      </StateWrap>
    );
  };
});

function TitleText({ useName }: { useName: () => string }) {
  const name = useName();
  return (
    <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
      <Link title={name} to="/" className="text-normal font-medium italic opacity-80">
        {name.slice(0, 16)}
      </Link>
    </div>
  );
}
