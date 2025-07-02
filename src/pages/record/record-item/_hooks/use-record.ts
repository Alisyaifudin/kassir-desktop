import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";
import { generateRecordSummary, Summary } from "~/lib/record";
import { Profile, Store } from "~/lib/store";
import { err, log, ok, Result, tryResult } from "~/lib/utils";
import { getProfile } from "~/pages/setting/shop/_hooks/utils";

export function useRecord(timestamp: number, context: { db: Database; store: Store }) {
	const { db, store } = context;
	const fetch = useCallback(async (): Promise<
		Result<"Aplikasi bermasalah" | "Catatan tidak ada", [Data, Profile, DB.Social[], DB.Method[]]>
	> => {
		const [[errData, data], [errProfile, profile], [errSocial, socials], [errMethods, methods]] =
			await Promise.all([
				getData(db, timestamp),
				tryResult({
					run: () => getProfile(store.profile),
				}),
				db.social.get.all(),
				db.method.get.all(),
			]);
		if (errData) return err(errData);
		if (errProfile) return err(errProfile);
		if (errSocial) return err(errSocial);
		if (errMethods) return err(errMethods);
		return ok([data, profile, socials, methods] as const);
	}, []);
	return useFetch(fetch);
}

export type Data = Summary & { method: DB.Method };

async function getData(
	db: Database,
	timestamp: number
): Promise<Result<"Aplikasi bermasalah" | "Catatan tidak ada", Data>> {
	const all = await Promise.all([
		db.record.get.byTimestamp(timestamp),
		db.recordItem.get.byTimestamp(timestamp),
		db.additional.get.byTimestamp(timestamp),
		db.discount.get.byTimestamp(timestamp),
		db.method.get.all(),
	]);
	for (const [errMsg] of all) {
		if (errMsg) return err(errMsg);
	}
	const record = all[0][1];
	if (record === null) return err("Catatan tidak ada");
	const items = all[1][1]!;
	const additionals = all[2][1]!;
	const discounts = all[3][1]!;
	const methods = all[4][1]!;
	const method = methods.find((m) => record.method_id === m.id);
	if (method === undefined) {
		log.error("No method?????");
		return err("Aplikasi bermasalah");
	}
	const summary = generateRecordSummary({ record, items, additionals, discounts });
	return ok({
		...summary,
		method,
	});
}
