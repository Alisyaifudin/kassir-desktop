import { LoaderFunctionArgs, redirect, RouteObject } from "react-router";
import { route as itemRoute } from "./record-item";
import { lazy } from "react";
import { useDB } from "~/hooks/use-db";
import { toast } from "sonner";
import { integer } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";

const Page = lazy(() => import("./Records"));

export const route: RouteObject = {
	path: "records",
	children: [
		{
			index: true,
			loader,
			Component: () => {
				const db = useDB();
				return <Page db={db} toast={toast.error} />;
			},
		},
		itemRoute,
	],
};

function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const time = url.searchParams.get("time");
	const parsed = integer.safeParse(time);
	if (!parsed.success) {
		const now = Date.now();
		throw redirect("/records?time=" + now);
	}
	const tz = Temporal.Now.timeZoneId();
	const t = Temporal.Instant.fromEpochMilliseconds(parsed.data).toZonedDateTimeISO(tz);
	const earliest = Temporal.ZonedDateTime.from({
		timeZone: tz,
		year: 1900,
		month: 1,
		day: 1,
	}).startOfDay();
	const furthest = Temporal.ZonedDateTime.from({
		timeZone: tz,
		year: 2101,
		month: 1,
		day: 1,
	}).startOfDay();
	if (
		Temporal.ZonedDateTime.compare(earliest, t) > 0 ||
		Temporal.ZonedDateTime.compare(furthest, t) < 0
	) {
		const now = Date.now();
		throw redirect("/records?time=" + now);
	}
	return null;
}
