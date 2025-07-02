import type { User, UserClaim } from "./auth";
import { invoke } from "@tauri-apps/api/core";
import { err, ok, Result } from "./utils";

export namespace jwt {
	export async function encode(user: User): Promise<Result<"Aplikasi bermasalah", string>> {
		try {
			const token = await invoke<string>("encode_jwt", {
				name: user.name,
				role: user.role,
			});
			return ok(token);
		} catch (error) {
			console.error(error);
			return err("Aplikasi bermasalah");
		}
	}
	export async function decode(token: string): Promise<Result<"Aplikasi bermasalah", UserClaim>> {
		try {
			const claims = await invoke<UserClaim>("decode_jwt", { token });
			return ok(claims);
		} catch (error) {
			console.error(error);
			return err("Aplikasi bermasalah");
		}
	}
}
