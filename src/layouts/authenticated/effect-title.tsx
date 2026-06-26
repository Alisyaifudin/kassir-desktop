import { TextError } from "~/components/TextError";
import { Link } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import { Effect } from "effect";
import { StoreService } from "~/services/store";
import { createLoader, TrackLoader } from "~/components/Loader";
import { LogPut, LogService } from "~/services/log";

const program = StoreService.pipe(
  Effect.flatMap((store) => store.info.get),
  Effect.tapError(LogPut),
);

export const title = Effect.gen(function* () {
  const store = yield* StoreService;
  const log = yield* LogService;
  const runnable = program.pipe(
    Effect.provideService(StoreService, store),
    Effect.provideService(LogService, log),
  );
  const loader = createLoader(runnable);
  return function Title() {
    return (
      <TrackLoader
        loader={loader}
        loading={
          <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
            <Skeleton className="h-5 w-24" />
          </div>
        }
        error={(error) => <TextError>{error.e.message}</TextError>}
      >
        {({ name }) => (
          <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
            <Link title={name} to="/" className="text-normal font-medium italic opacity-80">
              {name.slice(0, 16)}
            </Link>
          </div>
        )}
      </TrackLoader>
    );
  };
});

