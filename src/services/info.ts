import { Context, Effect } from "effect";
import { BaseError } from "~/lib/error-effect";
import { AsyncDataState, Status } from "~/lib/state";

export type Info = {
  address: string;
  footer: string;
  header: string;
  name: string;
};

export type InfoFull = Info & {
  showCashier: boolean;
};

export class InfoError extends BaseError("InfoError") {}

/**
 * Service for shop info (name, address, header, footer) and preferences.
 *
 * ## Architecture
 *
 * Uses two reactive state machines backed by `useSyncExternalStore`:
 * - {@link StatusState} — tracks whether the initial load completed
 * - {@link AsyncDataState} — tracks each mutable field with optimistic writes
 *
 * ## Usage pattern
 *
 * ### Page component (orchestrates loading):
 * ```tsx
 * const page = Effect.gen(function* () {
 *   const infoService = yield* InfoService;
 *   const useStatus = infoService.useStatus;
 *   const Info = yield* infoEffect;
 *   return function Page() {
 *     const status = useStatus();
 *     return (
 *       <StateWrap status={status} loading={<Loading />} error={...}>
 *         <Info />
 *       </StateWrap>
 *     );
 *   };
 * });
 * ```
 *
 * ### Form component (reads/writes data):
 * ```tsx
 * const infoEffect = Effect.gen(function* () {
 *   const infoService = yield* InfoService;
 *   const useInfo = infoService.info.useData;
 *   const setInfo = infoService.info.setData;
 *   return function Info() {
 *     const { data, state, error } = useInfo();
 *     const form = useForm({
 *       defaultValues: data,
 *       onSubmit({ value }) { return setInfo(value); },
 *     });
 *     // ... fields, submit button
 *   };
 * });
 * ```
 *
 * ### Layer wiring:
 * ```ts
 * const InfoLayer = Layer.effect(InfoService, Effect.gen(function* () {
 *   const store = yield* StoreService;
 *   const infoData = new DataState<Info, string>((data) =>
 *     store.info.set.info(data).pipe(
 *       Effect.catchTag("StoreError", ({ e }) => Effect.fail(e.message)),
 *     ),
 *   );
 *   const load = Effect.gen(function* () {
 *     const data = yield* store.info.get;
 *     infoData.setData(data);
 *     status.setSuccess();
 *   });
 *   const status = new StatusState<InfoError>(load);
 *   return InfoService.of({
 *     load,
 *     useStatus: status.useStatus,
 *     info: infoData,
 *     set: { info: setInfo },
 *   });
 * });
 * ```
 */
export class InfoService extends Context.Tag("InfoService")<
  InfoService,
  {
    load: Effect.Effect<void, InfoError>;
    useStatus: () => Status<InfoError>;
    info: AsyncDataState<Info, string>;
    showCashier: AsyncDataState<boolean, string>;
    set: {
      info: (info: Info) => Effect.Effect<Info, string>;
      showCashier: (showCashier: boolean) => Effect.Effect<boolean, string>;
    };
  }
>() {}

// example
// const InfoLayer = Layer.effect(
//   InfoService,
//   Effect.gen(function* () {
//     const store = yield* StoreService;
//     const log = yield* LogService;
//     const infoData = new DataState<Info, string>((data) =>
//       store.info.set
//         .info(data)
//         .pipe(Effect.catchTag("StoreError", ({ e }) => Effect.fail(e.message))),
//     );
//     const showCashierData = new DataState<boolean, string>((data) =>
//       store.info.set
//         .showCashier(data)
//         .pipe(Effect.catchTag("StoreError", ({ e }) => Effect.fail(e.message))),
//     );
//     const getAll = store.info.get.pipe(Effect.catchTag("StoreError", ({ e }) => InfoError.fail(e)));
//     function setInfo(info: Info) {
//       return store.info.set.info(info).pipe(
//         Effect.as(info),
//         Effect.catchAll(({ e }) => Effect.fail(e.message)),
//       );
//     }
//     function setShowCashier(showCashier: boolean) {
//       return store.info.set.showCashier(showCashier).pipe(
//         Effect.as(showCashier),
//         Effect.catchAll(({ e }) => Effect.fail(e.message)),
//       );
//     }
//     const load = Effect.gen(function* () {
//       status.setLoading();
//       status.notify();
//       const { showCashier, ...info } = yield* getAll;
//       infoData.setData(info);
//       showCashierData.setData(showCashier);
//       status.setSuccess();
//     }).pipe(
//       Effect.tapError((e) => {
//         setFatal(e);
//         return LogPut(e);
//       }),
//       Effect.tapError(LogPut),
//       Effect.provideService(LogService, log),
//     );
//     const status = new StatusState<InfoError>(load);
//     function setFatal(value: InfoError) {
//       status.setError(value);
//     }
//     return InfoService.of({
//       load,
//       useStatus: status.useStatus,
//       info: infoData,
//       showCashier: showCashierData,
//       set: {
//         info: setInfo,
//         showCashier: setShowCashier,
//       },
//     });
//   }),
// );
