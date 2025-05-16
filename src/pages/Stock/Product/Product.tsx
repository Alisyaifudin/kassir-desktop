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
import { History as HistoryComp, Loading } from "./History.tsx";
import { Form } from "./Form.tsx";
import { useAsyncDep } from "~/hooks/useAsyncDep.tsx";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs.tsx";
import { Images } from "./Images.tsx";
import { TextError } from "~/components/TextError.tsx";

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
	const mode = useMemo(() => {
		const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
		const mode = parsed.data ? parsed.data : "sell";
		return mode;
	}, [search]);
	const setMode = (mode: "buy" | "sell") => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("mode", mode);
			return search;
		});
	};
	const handleChangePage = (page: number) => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("page", page.toString());
			return search;
		});
	};
	const { item, history, images } = useItem(id, page, mode);
	const History = useMemo(
		() => (
			<Await state={history} Loading={<Loading />}>
				{({ products, total }) => {
					return (
						<HistoryComp
							mode={mode}
							setMode={setMode}
							id={id}
							products={products}
							handleChangePage={handleChangePage}
							total={total}
							page={page}
						/>
					);
				}}
			</Await>
		),
		[history, search]
	);
	const handleBack = () => {
		const backURL = getBackURL("/stock", search);
		navigate(backURL);
	};
	const tab = useMemo(() => {
		const tab = z.enum(["history", "image"]).catch("history").parse(search.get("tab"));
		return tab;
	}, [search]);
	const setTab = (val: string) => {
		const tab = z.enum(["history", "image"]).catch("history").parse(val);
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("tab", tab);
			return search;
		});
	};
	return (
		<main className="py-2 px-5 mx-auto w-full flex flex-col gap-2 flex-1 overflow-hidden">
			<Button variant="link" className="self-start" onClick={handleBack}>
				<ChevronLeft /> Kembali
			</Button>
			<div className="flex gap-2 h-full overflow-hidden">
				<Await state={item} Loading={<Loader2 className="animate-spin" />}>
					{(product) => {
						if (product === null) {
							return <Redirect to="/stock" />;
						}
						const Detail =
							user.role === "user" ? (
								<Info product={product} />
							) : (
								<Form product={product} handleBack={handleBack} images={images} />
							);
						return (
							<>
								{Detail}
								<Tabs value={tab} onValueChange={setTab} className="w-[1200px] overflow-hidden">
									<TabsList>
										<TabsTrigger value="history" className="text-3xl">
											Transaksi
										</TabsTrigger>
										<TabsTrigger value="image" className="text-3xl">
											Gambar
										</TabsTrigger>
									</TabsList>
									<TabsContent value="history" className="overflow-hidden h-full">
										{History}
									</TabsContent>
									<TabsContent value="image" className="h-full">
										<Await state={images} Error={(error) => <TextError>{error}</TextError>}>
											{(images) => <Images images={images} productId={id} role={user.role}/>}
										</Await>
									</TabsContent>
								</Tabs>
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
		<div className="grid grid-cols-[150px_1fr] h-fit gap-3 text-3xl w-full">
			<h1 className="font-bold text-3xl col-span-2">Info barang</h1>
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

const useItem = (id: number, page: number, mode: "buy" | "sell") => {
	const db = useDB();
	const item = useAsync(() => db.product.get(id));
	const images = useAsync(() => db.image.getImages(id), ["fetch-images"]);
	const history = useAsyncDep(
		() => db.product.getHistory(id, (page - 1) * LIMIT, LIMIT, mode),
		[page, mode]
	);
	return { item, history, images };
};
