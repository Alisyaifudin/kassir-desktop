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

    function loader() {
      return Effect.gen(function* () {
        const infoData = infoState.getSnapshot();
        const showCashierData = showCashierState.getSnapshot();
        if (infoData !== null && showCashierData !== null) {
          return;
        }
        const { showCashier, ...info } = yield* getAll;
        infoState.setData(info);
        showCashierState.setData(showCashier);
      }).pipe(
        Effect.tapError(LogPut),
        Effect.provideService(LogService, log),
      );
    }

    return InfoService.of({
      loader,
      info: {
        useInfo: infoState.useData,
        useName,
        set: (info) =>
          Effect.gen(function* () {
            const error = yield* store.info.set.info(info);
            if (error === null) {
              infoState.setData(info);
            } else {
              yield* LogPut(error.e);
              return yield* Effect.fail(error.e);
            }
          }),
      },
      showCashier: {
        useShowCashier: showCashierState.useData,
        set: (showCashier) =>
          Effect.gen(function* () {
            const error = yield* store.info.set.showCashier(showCashier);
            if (error === null) {
              showCashierState.setData(showCashier);
            } else {
              yield* LogPut(error.e);
              return yield* Effect.fail(error.e);
            }
          }),
      },
    });
  }),
);
