import { invoke } from "@tauri-apps/api/core";
import { err, log, ok, Result, safeJSON } from "./utils";
import { z } from "zod";
// import { jwt } from "./jwt";
export type User = {
  name: string;
  role: "admin" | "user";
};

let _user: undefined | User = undefined;

const userSchema = z.object({
  name: z.string(),
  role: z.enum(["admin", "user"]),
});

export const auth = {
  get() {
    if (_user === undefined) {
      const raw = localStorage.getItem("user");
      if (raw === null) {
        return undefined;
      }
      const [errJson, json] = safeJSON(raw);
      if (errJson) {
        localStorage.removeItem("user");
        return undefined;
      }
      const parsed = userSchema.safeParse(json);
      if (!parsed.success) {
        localStorage.removeItem("user");
        return undefined;
      }
      _user = parsed.data;
    }
    return _user;
  },
  set(user?: User) {
    if (user === undefined) {
      localStorage.removeItem("user");
    } else {
      localStorage.setItem("user", JSON.stringify(user));
    }
    _user = user;
  },
  async hash(password: string): Promise<Result<"Aplikasi bermasalah", string>> {
    try {
      const hashedPassword = await invoke<string>("hash_password", { password });
      return ok(hashedPassword);
    } catch (error) {
      log.error("Hashing failed: " + String(error));
      return err("Aplikasi bermasalah");
    }
  },
  async verify(
    password: string,
    storedHash: string,
  ): Promise<"Aplikasi bermasalah" | "Kata sandi salah" | null> {
    try {
      const isMatch = await invoke<boolean>("verify_password", {
        password,
        hash: storedHash,
      });
      if (isMatch) {
        return null;
      } else {
        return "Kata sandi salah";
      }
    } catch (error) {
      console.error(error);
      log.error(JSON.stringify(error));
      log.error("Hashing failed: " + String(error));
      return "Aplikasi bermasalah";
    }
  },

  // export async function decode(token: string): Promise<
  //   Result<
  //     "Invalid" | "Failed to encode" | "Expired",
  //     {
  //       user: User;
  //       token?: string;
  //     }
  //   >
  // > {
  //   const now = Date.now() / 1000;
  //   // try {
  //   //   var tokenRaw = await store.core.get("token");
  //   // } catch (error) {
  //   //   log.error(JSON.stringify(error));
  //   //   log.error("Failed to get token");
  //   //   return err("Aplikasi bermasalah");
  //   // }
  //   // const token = z.string().nullish().catch(null).parse(tokenRaw);
  //   // if (token === undefined || token === null) return ok(null);
  //   const [errMsg, claims] = await jwt.decode(token);
  //   let nextToken: undefined | string = undefined;
  //   if (errMsg) {
  //     // store.core.delete("token");
  //     return err(errMsg);
  //   }
  //   if (claims.exp < now) return err("Expired");
  //   if (claims.exp - now < 1 * 24 * 3600) {
  //     const [errToken, token] = await jwt.encode(claims);
  //     if (errToken) {
  //       log.error("Failed encode token");
  //       return err("Failed to encode");
  //     }
  //     nextToken = token;
  //     // store.core.set("token", token);
  //   }
  //   return ok({ user: claims, token: nextToken });
  // }

  // export async function logout(store: Store): Promise<"Aplikasi bermasalah" | null> {
  //   try {
  //     await store.core.delete("token");
  //   } catch (error) {
  //     log.error(String(error));
  //     return "Aplikasi bermasalah";
  //   }
  //   return null;
  // }
};

export type UserClaim = {
  name: string;
  role: "admin" | "user";
  exp: number;
};
