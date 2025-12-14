import { MiddlewareFunction, redirect } from "react-router";
// import { store } from "~/store";
// import { log } from "~/lib/utils";
import { auth } from "~/lib/auth";

// export const authentication: MiddlewareFunction = async (_arg, next) => {
//   const [errStore, token] = await store.token.get();
//   if (errStore) {
//     throw new Error(errStore);
//   }
//   const [errMsg, res] = await auth.decode(token);
//   switch (errMsg) {
//     case "Expired":
//     case "Invalid":
//       store.token.set("");
//       throw redirect("/login");
//     case "Failed to encode":
//       log.error(errMsg);
//       throw new Error("Applikasi bermasalah.");
//   }
//   if (res.token !== undefined) {
//     store.token.set(res.token);
//   }
//   await next();
// };

// export async function getUser(): Promise<User> {
//   const [errStore, token] = await store.token.get();
//   if (errStore) {
//     throw new Error(errStore);
//   }
//   const [errMsg, res] = await auth.decode(token);
//   switch (errMsg) {
//     case "Expired":
//       throw new Error("Kadaluarsa. Silakan login lagi.");
//     case "Invalid":
//       throw new Error("Dilarang! Harus login terlebih dahulu.");
//     case "Failed to encode":
//       log.error(errMsg);
//       throw new Error("Aplikasi bermasalah");
//   }
//   if (res.token !== undefined) {
//     store.token.set(res.token);
//   }
//   return res.user;
// }

export const authentication: MiddlewareFunction = async (_arg, next) => {
  const user = auth.get();
  if (user === undefined) {
    throw redirect("/login");
  }
  await next();
};
