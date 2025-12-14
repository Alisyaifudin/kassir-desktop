// import { RouteObject } from "react-router";
// import { integer, LoaderArgs } from "~/lib/utils";
// import { getContext } from "~/middleware/global";

// export type SearchRes =
// 	| {
// 			error: string;
// 	  }
// 	| {
// 			data: { mode: DB.Mode; timestamp: number } | null;
// 	  };

// export async function loader({ context, params }: LoaderArgs): Promise<SearchRes> {
// 	const parsed = integer.safeParse(params.no);
// 	if (!parsed.success) {
// 		return { data: null };
// 	}
// 	const timestamp = parsed.data;
// 	const { db } = getContext(context);
// 	const [errMsg, record] = await db.record.get.byTimestamp(timestamp);
// 	switch (errMsg) {
// 		case "Aplikasi bermasalah":
// 			return { error: errMsg };
// 		case "Tidak ditemukan":
// 			return { data: null };
// 	}
// 	return { data: { timestamp, mode: record.mode } };
// }

// export const route: RouteObject = {
// 	path: "search/:no",
// 	loader,
// };
