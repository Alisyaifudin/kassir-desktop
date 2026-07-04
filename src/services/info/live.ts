import { Effect, Layer } from "effect";
import { Info, InfoError, InfoService } from ".";
import { StoreService } from "../store";
import { LogPut, LogService } from "../log";
import { DataStateUnsafe } from "~/lib/state";

const InfoLayer = Layer.effect(
  InfoService,
  Effect.gen(function* () {
    const store = yield* StoreService;
    const log = yield* LogService;
    const infoState = new DataStateUnsafe<Info>();
    const showCashierState = new DataStateUnsafe<boolean>();
    const getAll = store.info.get.pipe(Effect.catchTag("StoreError", ({ e }) => InfoError.fail(e)));
    function useName() {
      const info = infoState.useData();
      return info.name;
    }
    const loader = () =>
      Effect.runPromise(
        Effect.gen(function* () {
          const infoData = infoState.getSnapshot();
          const showCashierData = showCashierState.getSnapshot();
          if (infoData !== null && showCashierData !== null) {
            return null;
          }
          const { showCashier, ...info } = yield* getAll;
          infoState.setData(info);
          showCashierState.setData(showCashier);
          return null;
        }).pipe(
          Effect.tapError(LogPut),
          Effect.catchAll((e) => Effect.succeed(e)),
          Effect.provideService(LogService, log),
        ),
      );
    return InfoService.of({
      loader,
      infoService: {
        useInfo: infoState.useData,
        set: async (info) => {
          const error = await store.info.set.info(info);
          if (error === null) {
            infoState.setData(info);
            return null;
          } else {
            Effect.runFork(log.put(error.e));
            return error.e.message;
          }
        },
      },
      showCashierService: {
        useShowCashier: showCashierState.useData,
        set: async (showCashier) => {
          const error = await store.info.set.showCashier(showCashier);
          if (error === null) {
            showCashierState.setData(showCashier);
            return null;
          } else {
            Effect.runFork(log.put(error.e));
            return error.e.message;
          }
        },
      },
      useName,
    });
  }),
);
