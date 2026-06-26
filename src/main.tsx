// import ReactDOM from "react-dom/client";
// import { RouterProvider } from "react-router";
// import "./global.css";
// import { routerEffect } from "./route";
// import { Effect, Layer } from "effect";
// import { User, UserService } from "./services/user";
// import { LogService } from "./services/log";
// import { StoreService } from "./services/store";
// import { DBService } from "./services/db";
// import { DbError, StoreError } from "./lib/error-effect";

// const user: User = {
//   id: "1",
//   name: "uwu",
//   role: "admin",
// };

// const userResource = UserService.of({
//   setUser(_user) {
//     return Effect.void;
//   },
//   useUser() {
//     return user;
//   },
//   user,
// });

// const userDummy = Layer.succeed(UserService, userResource);

// const storeResource = StoreService.of({
//   size: {
//     get: Effect.succeed("big" as const).pipe(
//       Effect.catchAll(() => StoreError.fail(new Error("uwu"))),
//     ),
//   },
//   info: {
//     get: Effect.succeed({
//       address: "",
//       footer: "",
//       header: "",
//       name: "",
//       showCashier: true,
//     }).pipe(Effect.catchAll(() => StoreError.fail(new Error("uwu")))),
//   },
// });

// const storeDummy = Layer.succeed(StoreService, storeResource);

// const dbResource = DBService.of({
//   record: {
//     count: {
//       total(start, end, mode) {
//         return Effect.succeed(1).pipe(
//           Effect.catchAll(() => Effect.fail(new DbError(new Error("uwu")))),
//         );
//       },
//       record(start, end) {
//         return Effect.succeed({ in: 1, out: 1 }).pipe(
//           Effect.catchAll(() => Effect.fail(new DbError(new Error("uwu")))),
//         );
//       },
//     },
//   },
// });

// const dbDummy = Layer.succeed(DBService, dbResource);

// const logResource = Effect.gen(function* () {
//   yield* DBService;
//   return LogService.of({
//     put(_e) {
//       return Effect.void;
//     },
//   });
// });

// const logDummy = Layer.effect(LogService, logResource);
// const logDbDummy = Layer.provide(logDummy, dbDummy);

// const AppDummy = Layer.mergeAll(storeDummy, dbDummy, logDbDummy, userDummy);

// const routerLive = Effect.provide(routerEffect, AppDummy);
// const router = Effect.runSync(routerLive);

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   <RouterProvider router={router} />,
// );
