import { exists, mkdir, writeFile, readFile, remove } from "@tauri-apps/plugin-fs";
import { err, log, ok, Result, tryResult } from "./utils";
import * as path from "@tauri-apps/api/path";

export namespace image {
	export async function save(file: File, name: string): Promise<"Aplikasi bermasalah" | null> {
		const [errCheck, checkExist] = await tryResult({
			run: () =>
				exists("images", {
					baseDir: path.BaseDirectory.AppData,
				}),
		});
		if (errCheck) {
			log.error("Failed to check directory");
			return errCheck;
		}
		if (!checkExist) {
			const [errMkdir] = await tryResult({
				run: () =>
					mkdir("images", {
						baseDir: path.BaseDirectory.AppData,
					}),
			});
			if (errMkdir) {
				log.error("Failed to create directory");
				return errMkdir;
			}
		}
		const arrayBuffer = await file.arrayBuffer();
		const data = new Uint8Array(arrayBuffer);
		const [errJoin, pathname] = await tryResult({
			run: () => path.join("images", name),
		});
		if (errJoin) {
			log.error("Failed to join path");
			return errJoin;
		}

		const [errMsg] = await tryResult({
			run: () =>
				Promise.all([
					writeFile(pathname, data, {
						baseDir: path.BaseDirectory.AppData,
					}),
				]),
		});
		if (errMsg) {
			log.error("Failed to save file");
		}
		return errMsg;
	}
	export async function load(
		name: string,
		mimeType: "image/png" | "image/jpeg"
	): Promise<Result<"Aplikasi bermasalah", string>> {
		const [errJoin, pathname] = await tryResult({
			run: () => path.join("images", name),
		});
		if (errJoin) return err(errJoin);
		const [errImage, image] = await tryResult({
			run: () =>
				readFile(pathname, {
					baseDir: path.BaseDirectory.AppData,
				}),
		});
		if (errImage) return err(errImage);
		const blob = new Blob([image as any], { type: mimeType });
		const objectURL = URL.createObjectURL(blob);
		return ok(objectURL);
	}
	export async function del(name: string): Promise<"Aplikasi bermasalah" | null> {
		const [errJoin, pathname] = await tryResult({
			run: () => path.join("images", name),
		});
		if (errJoin) return errJoin;
		const [errMsg] = await tryResult({
			run: () =>
				remove(pathname, {
					baseDir: path.BaseDirectory.AppData,
				}),
		});
		return errMsg;
	}
}
