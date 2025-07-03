import { invoke } from "@tauri-apps/api/core";
import { err, log, ok, Result } from "./utils";
import { Store } from "./store";
import { jwt } from "./jwt";
import { z } from "zod";

export namespace auth {
	export async function hash(password: string): Promise<Result<"Aplikasi bermasalah", string>> {
		try {
			const hashedPassword = await invoke<string>("hash_password", { password });
			return ok(hashedPassword);
		} catch (error) {
			log.error("Hashing failed: " + String(error));
			return err("Aplikasi bermasalah");
		}
	}
	export async function verify(
		password: string,
		storedHash: string
	): Promise<"Aplikasi bermasalah" | "Kata sandi salah" | null> {
		if (storedHash === "") {
			if (password === storedHash) {
				return null;
			}
			return "Kata sandi salah";
		}
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
			log.error(JSON.stringify(error));
			log.error("Hashing failed: " + String(error));
			return "Aplikasi bermasalah";
		}
	}
	export async function store(store: Store, user: User): Promise<"Aplikasi bermasalah" | null> {
		const [errMsg, token] = await jwt.encode(user);
		if (errMsg) {
			log.error("Failed to encode");
			return errMsg;
		}
		store.core.set("token", token);
		return null;
	}

	export async function decode(store: Store): Promise<Result<"Aplikasi bermasalah", null | User>> {
		const now = Date.now() / 1000;
		try {
			var tokenRaw = await store.core.get("token");
		} catch (error) {
			log.error(JSON.stringify(error));
			log.error("Failed to get token");
			return err("Aplikasi bermasalah");
		}
		const token = z.string().nullish().catch(null).parse(tokenRaw);
		if (token === undefined || token === null) return ok(null);
		const [errMsg, claims] = await jwt.decode(token);
		if (errMsg) {
			log.error("Failed to decode token");
			store.core.delete("token");
			return ok(null);
		}
		if (claims.exp < now) return ok(null);
		if (claims.exp - now < 1 * 24 * 3600) {
			const [errToken, token] = await jwt.encode(claims);
			if (errToken) {
				log.error("Failed encode token");
				return err(errToken);
			}
			store.core.set("token", token);
		}
		return ok(claims);
	}
	export async function logout(store: Store): Promise<"Aplikasi bermasalah" | null> {
		try {
			await store.core.delete("token");
		} catch (error) {
			log.error(String(error));
			return "Aplikasi bermasalah";
		}
		return null;
	}
}

export type UserClaim = {
	name: string;
	role: "admin" | "user";
	exp: number;
};

export type User = {
	name: string;
	role: "admin" | "user";
};
