import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { getBackURL, numeric } from "~/lib/utils.ts";
import { useMemo } from "react";
import { Button } from "~/components/ui/button.tsx";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useDB } from "~/RootLayout";
import Redirect from "~/components/Redirect.tsx";
import { Await } from "~/components/Await.tsx";
import { useAsync } from "~/hooks/useAsync.tsx";
import { type loader } from "./index.tsx";
import { useUser } from "~/Layout.tsx";
import { History as HistoryComp } from "./History.tsx";
import { Temporal } from "temporal-polyfill";
import { Form } from "./Form.tsx";
import { useAsyncDep } from "~/hooks/useAsyncDep.tsx";

export default function Page() {
	const { id } = useLoaderData<typeof loader>();
	const user = useUser();
	const navigate = useNavigate();
	const [search, setSearch] = useSearchParams();
	const time = useMemo(() => {
		const parsed = numeric.safeParse(search.get("time"));
		const time = parsed.success ? parsed.data : Temporal.Now.instant().epochMilliseconds;
		return time;
	}, [search]);
	const { item, history } = useItem(id, time);
	const setTime = (time: number) => {
		setSearch({ time: time.toString() });
	};
	const History = useMemo(
		() => (
			<Await
				state={history}
				Loading={<HistoryComp id={id} history={[]} time={time} setTime={setTime} />}
			>
				{(history) => {
					return <HistoryComp id={id} history={history} time={time} setTime={setTime} />;
				}}
			</Await>
		),
		[history]
	);
	const handleBack = () => {
		const backURL = getBackURL("/stock", search);
		navigate(backURL);
	};
	return (
		<main className="py-2 px-5 mx-auto w-full flex flex-col gap-2 flex-1 overflow-auto">
			<Button variant="link" className="self-start" onClick={handleBack}>
				<ChevronLeft /> Kembali
			</Button>
			<div className="flex gap-2 overflow-hidden">
				<Await state={item} Loading={<Loader2 className="animate-spin" />}>
					{(product) => {
						if (product === null) {
							return <Redirect to="/stock" />;
						}
						if (user.role === "user") {
							return (
								<>
									<Info product={product} />
									{History}
								</>
							);
						}
						return (
							<>
								<Form product={product} />
								{History}
							</>
						);
					}}
				</Await>
			</div>
		</main>
	);
}

function Info({ product }: { product: DB.Product }) {
	return (
		<div className="grid grid-cols-[150px_1fr] gap-3 text-3xl w-full">
			<h1 className="font-bold text-3xl">Info barang</h1>
			<p>Nama</p>
			<p>{product.name}</p>
			<p>Harga</p>
			<p>{product.price}</p>
			<p>Modal</p>
			<p>{product.capital}</p>
			<p>Stok</p>
			<p>{product.stock}</p>
			<p>Barcode</p>
			<p>{product.barcode}</p>
			{product.note === "" ? null : (
				<>
					<p>Catatan</p>
					<p>{product.note}</p>
				</>
			)}
		</div>
	);
}

const useItem = (id: number, time: number) => {
	const db = useDB();
	const { start, end } = useMemo(() => {
		const tz = Temporal.Now.timeZoneId();
		const { year, month } = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
		const start = Temporal.ZonedDateTime.from({ timeZone: tz, year, month, day: 1 }).startOfDay();
		const end = start.add(Temporal.Duration.from({ months: 1 }));
		return { start, end };
	}, [time]);
	const item = useAsync(() => db.product.get(id));

	const history = useAsyncDep(
		() => db.product.getHistory(id, start.epochMilliseconds, end.epochMilliseconds),
		[start]
	);
	return { item, history };
};
