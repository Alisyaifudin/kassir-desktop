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
import { Form } from "./Form.tsx";
import { useAsyncDep } from "~/hooks/useAsyncDep.tsx";

export const LIMIT = 20;

export default function Page() {
	const { id } = useLoaderData<typeof loader>();
	const user = useUser();
	const navigate = useNavigate();
	const [search, setSearch] = useSearchParams();
	const page = useMemo(() => {
		const parsed = numeric.safeParse(search.get("page"));
		let page = 1;
		if (parsed.data && parsed.data > 0) {
			page = parsed.data;
		}
		return page;
	}, [search]);
	const { item, history } = useItem(id, page);
	const History = useMemo(
		() => (
			<Await
				state={history}
				Loading={
					<HistoryComp
						id={id}
						products={[]}
						page={0}
						total={0}
						setSearch={setSearch}
						search={search}
					/>
				}
			>
				{({ products, total }) => (
					<HistoryComp
						search={search}
						id={id}
						products={products}
						total={total}
						page={page}
						setSearch={setSearch}
					/>
				)}
			</Await>
		),
		[history, search]
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

const useItem = (id: number, page: number) => {
	const db = useDB();
	const item = useAsync(() => db.product.get(id));

	const history = useAsyncDep(() => db.product.getHistory(id, (page - 1) * LIMIT, LIMIT), [page]);
	return { item, history };
};
