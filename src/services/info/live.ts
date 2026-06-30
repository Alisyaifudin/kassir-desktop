import { Effect, Layer } from "effect";
import { Info, InfoError, InfoService } from ".";
import { StoreService } from "../store";
import { LogPut, LogService } from "../log";
import { AsyncDataState, StatusState } from "~/lib/state";

const InfoLayer = Layer.effect(
  InfoService,
  Effect.gen(function* () {
    const store = yield* StoreService;
    const log = yield* LogService;
    const infoState = new AsyncDataState<Info, string>((data) =>
      store.info.set
        .info(data)
        .pipe(Effect.catchTag("StoreError", ({ e }) => Effect.fail(e.message))),
    );
    const showCashierState = new AsyncDataState<boolean, string>((data) =>
      store.info.set
        .showCashier(data)
        .pipe(Effect.catchTag("StoreError", ({ e }) => Effect.fail(e.message))),
    );
    const getAll = store.info.get.pipe(Effect.catchTag("StoreError", ({ e }) => InfoError.fail(e)));
    function setInfo(info: Info) {
      return store.info.set.info(info).pipe(
        Effect.as(info),
        Effect.catchAll(({ e }) => Effect.fail(e.message)),
      );
    }
    function setShowCashier(showCashier: boolean) {
      return store.info.set.showCashier(showCashier).pipe(
        Effect.as(showCashier),
        Effect.catchAll(({ e }) => Effect.fail(e.message)),
      );
    }
    function useName() {
      const info = infoState.useData();
      return info.data.name;
    }
    const load = () =>
      Effect.gen(function* () {
        status.setLoading();
        status.notify();
        const { showCashier, ...info } = yield* getAll;
        infoState.setData(info);
        showCashierState.setData(showCashier);
        status.setSuccess();
      }).pipe(
        Effect.tapError((e) => {
          setFatal(e);
          return LogPut(e);
        }),
        Effect.tapError(LogPut),
        Effect.provideService(LogService, log),
      );
    const status = new StatusState<InfoError>(load);
    function setFatal(value: InfoError) {
      status.setError(value);
    }
    return InfoService.of({
      useLoad: status.useStatus,
      info: infoState,
      showCashier: showCashierState,
      useName,
      set: {
        info: setInfo,
        showCashier: setShowCashier,
      },
    });
  }),
);
