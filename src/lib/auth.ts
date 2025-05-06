import { invoke } from "@tauri-apps/api/core";
import { err, log, ok, Result } from "./utils";
import { Temporal } from "temporal-polyfill";
import { Store } from "../store";

export namespace auth {
	export async function hash(password: string): Promise<Result<"Aplikasi bermasalah", string>> {
		if (password === "") {
			return ok("");
		}
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
			console.error(error);
			log.error("Hashing failed: " + String(error));
			return "Aplikasi bermasalah";
		}
	}
	// Helper function to generate random tokens
	async function generateRandomToken() {
		const array = new Uint8Array(32);
		window.crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...Array.from(array)));
	}
	export async function store(
		store: Store,
		name: string,
		role: "admin" | "user"
	): Promise<"Aplikasi bermasalah" | null> {
		const today = Temporal.Now.instant().epochMilliseconds;
		const expires = today + 5 * DAYS_IN_MS;
		try {
			var token = await generateRandomToken();
		} catch (error) {
			log.error(String(error));
			return "Aplikasi bermasalah";
		}
		localStorage.setItem("token", token);
		try {
			await store.core.set(`token`, {
				token,
				name,
				role,
				expires,
			});
		} catch (error) {
			log.error(String(error));
			return "Aplikasi bermasalah";
		}
		return null;
	}
	export async function validate(store: Store, token: string): Promise<null | User> {
		const user = await store.core.get<User>("token");
		const today = Temporal.Now.instant();
		if (!user || user.token !== token || user.expires < today.epochMilliseconds) {
			localStorage.removeItem("token");
			store.core.delete("token");
			return null;
		}
		if (user.expires - today.epochMilliseconds < 1 * DAYS_IN_MS) {
			const newToken = await generateRandomToken();
			localStorage.setItem("token", newToken);
			const newUser = {
				name: user.name,
				expires: today.add(Temporal.Duration.from({ days: 5 })).epochMilliseconds,
				role: user.role,
				token: newToken,
			};
			await store.core.set("token", newUser);
			return newUser;
		}
		return user;
	}
	export async function logout(store: Store): Promise<"Aplikasi bermasalah" | null> {
		localStorage.removeItem("token");
		try {
			await store.core.delete("token");
		} catch (error) {
			log.error(String(error));
			return "Aplikasi bermasalah";
		}
		return null;
	}
}

const DAYS_IN_MS = 24 * 3600 * 1000;

export type User = {
	name: string;
	expires: number;
	role: "admin" | "user";
	token: string;
};
