// import { Effect, Layer } from "effect";
// import { LogService } from ".";
// import { LogError } from "./error";
// import { AsyncDataState, StatusState } from "~/lib/state";
// import { BaseDirectory, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

// const LOG_PATH = "logs/kassir.log";

// const LogLayer = Layer.effect(
//   LogService,
//   Effect.gen(function* () {
//     const readEffect = Effect.tryPromise({
//       try: () => readTextFile(LOG_PATH, { baseDir: BaseDirectory.AppLocalData }),
//       catch: (e) => LogError.new(e),
//     }).pipe(
//       Effect.map((buffer) => {
//         const text = buffer || "";
//         return text
//           .split("\n")
//           .filter((s) => !s.includes("[WARN]"))
//           .reverse();
//       }),
//     );

//     const clearEffect = Effect.tryPromise({
//       try: () => writeTextFile(LOG_PATH, "", { baseDir: BaseDirectory.AppLocalData }),
//       catch: (e) => LogError.new(e),
//     });

//     const writeEffect = (lines: string[]) =>
//       Effect.tryPromise({
//         try: () =>
//           writeTextFile(
//             LOG_PATH,
//             lines.reverse().join("\n"),
//             { baseDir: BaseDirectory.AppLocalData },
//           ),
//         catch: (e) => LogError.new(e),
//       });

//     const logData = new AsyncDataState<string[], string>((lines) =>
//       writeEffect(lines).pipe(Effect.catchTag("LogError", ({ e }) => Effect.fail(e.message))),
//     );

//     const load = () =>
//       Effect.gen(function* () {
//         status.setLoading();
//         status.notify();
//         const lines = yield* readEffect;
//         logData.setData(lines);
//         status.setSuccess();
//       }).pipe(Effect.tapError((e) => status.setError(e)));

//     const clear = () =>
//       Effect.gen(function* () {
//         yield* clearEffect;
//         logData.setData([]);
//       });

//     const status = new StatusState<LogError>(load);

//     return LogService.of({
//       put() {
//         return Effect.void;
//       },
//       useStatus: status.useStatus,
//       log: logData,
//       clear,
//     });
//   }),
// );
