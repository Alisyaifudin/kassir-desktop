import { invoke } from "@tauri-apps/api/core";
import { err, logOld, ok, ResultOld, safeJSON } from "./utils";
import { z } from "zod";
// import { jwt } from "./jwt";
export type User = {
  name: string;
  role: "admin" | "user";
};

export let _user: undefined | User = undefined;

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
  user() {
    const user = this.get();
    if (user === undefined) throw new Error("Unauthenticated");
    return user;
  },
  set(user?: User) {
    if (user === undefined) {
      localStorage.removeItem("user");
    } else {
      localStorage.setItem("user", JSON.stringify(user));
    }
    _user = user;
  },
  async hash(password: string): Promise<ResultOld<"Aplikasi bermasalah", string>> {
    try {
      const hashedPassword = await invoke<string>("hash_password", { password });
      return ok(hashedPassword);
    } catch (error) {
      logOld.error("Hashing failed: " + String(error));
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
      logOld.error(JSON.stringify(error));
      logOld.error("Hashing failed: " + String(error));
      return "Aplikasi bermasalah";
    }
  },

};

export type UserClaim = {
  name: string;
  role: "admin" | "user";
  exp: number;
};
