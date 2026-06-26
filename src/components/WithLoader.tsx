// export class LoaderSettled<T> {
//   constructor(
//     private subscribe: (cb: Listener) => () => void,
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     private getSnapshot: () => Data<T, any>,
//   ) {}
//   use() {
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     const data = useSyncExternalStore(this.subscribe, this.getSnapshot);
//     if (data.state === "init-loading" || data.state === "init-error") {
//       throw new Error(
//         "loader.use() was called before data was available. Wrap your component with <WithLoader> to ensure data is loaded first.",
//       );
//     }
//     return data;
//   }
// }

// class LoaderClass<T, E = never> {
//   private data: Data<T, E> = { state: "init-loading" };
//   private listeners = new Set<Listener>();

//   constructor(private effect: Effect.Effect<T, E>) {}

//   async run() {
//     return Effect.runPromise(pipe(this.effect, Effect.either));
//   }

//   get view() {
//     return new LoaderSettled(this.subscribe, this.getSnapshot);
//   }
//   private setDataRaw(updater: ((prev: Data<T, E>) => Data<T, E>) | Data<T, E>) {
//     if (typeof updater === "function") {
//       this.data = updater(this.data);
//     } else {
//       this.data = updater;
//     }
//     this.listeners.forEach((l) => l());
//   }
//   get setError() {
//     const setDataRaw = this.setDataRaw;
//     return {
//       init(e: E) {
//         setDataRaw((prev) => {
//           if (prev.state !== "init-loading") return prev;
//           return { state: "init-error", error: e };
//         });
//       },
//       update(error: ErrorData) {
//         setDataRaw((prev) => {
//           if (prev.state !== "success") return prev;
//           return { state: "update-error", error, data: prev.data };
//         });
//       },
//     };
//   }
//   get setLoading() {
//     const setDataRaw = this.setDataRaw;
//     return {
//       init() {
//         setDataRaw((prev) => {
//           if (prev.state !== "init-error") return prev;
//           return { state: "init-loading" };
//         });
//       },
//       update() {
//         setDataRaw((prev) => {
//           if (prev.state !== "success") return prev;
//           return { state: "update-loading", data: prev.data };
//         });
//       },
//     };
//   }
//   setData(data: T) {
//     this.setDataRaw((prev) => {
//       if (prev.state !== "init-loading" && prev.state !== "update-loading") return prev;
//       return { state: "success", data };
//     });
//   }

//   async refetch(onError: (e: E) => ErrorData) {
//     if (this.data.state !== "success") return;
//     this.setLoading.update();
//     const either = await this.run();
//     Either.match(either, {
//       onLeft: (e) => {
//         const error = onError(e);
//         this.setError.update(error);
//       },
//       onRight: (data) => this.setData(data),
//     });
//   }

//   cleanup() {
//     this.listeners.clear();
//   }

//   private subscribe(cb: Listener) {
//     this.listeners.add(cb);
//     return () => {
//       this.listeners.delete(cb);
//     };
//   }

//   private getSnapshot() {
//     return this.data;
//   }

//   useDataState() {
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     return useSyncExternalStore(this.subscribe, this.getSnapshot);
//   }
// }

// export function WithLoader<T, E = never>({ error, loader, children, loading }: Props<T, E>) {
//   const data = loader.useDataState();

//   useEffect(() => {
//     async function init() {
//       const either = await loader.run();
//       Either.match(either, {
//         onLeft(error) {
//           loader.setError.init(error);
//         },
//         onRight(data) {
//           loader.setData(data);
//         },
//       });
//     }
//     init();
//   }, [loader]);

//   // Cleanup on unmount or when loader changes
//   useEffect(() => {
//     return () => {
//       loader.cleanup();
//     };
//   }, [loader]);

//   if (data.state === "init-loading") {
//     return loading ?? null;
//   }
//   if (data.state === "init-error") {
//     return error === undefined ? null : error(data.error);
//   }
//   return children;
// }