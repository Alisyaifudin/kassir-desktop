import { useNavigate, useSearchParams } from "react-router";
import { getBackURL } from "~/lib/utils";
import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import Redirect from "~/components/Redirect";
import { History as HistoryComp } from "./_components/History";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Images } from "./_components/Images";
import { TextError } from "~/components/TextError";
import { User } from "~/lib/auth";
import { Database } from "~/database";
import { Info } from "./_components/Info";
import { useItem } from "./_hooks/useItem";
import { Async } from "~/components/Async";
import { useTab } from "./_hooks/use-tab";
import { Form } from "./_components/Form";

export default function Page({ user, id, db }: { id: number; user: User; db: Database }) {
	const navigate = useNavigate();
	const [search, setSearch] = useSearchParams();
	const { item, images, revalidate } = useItem(id, db);
	const History = useMemo(
		() => <HistoryComp db={db} search={search} setSearch={setSearch} id={id} />,
		[history, search]
	);
	const handleBack = () => {
		const backURL = getBackURL("/stock", search);
		navigate(backURL);
	};
	const [tab, setTab] = useTab(search, setSearch);
	return (
		<main className="py-2 px-5 mx-auto w-full flex flex-col gap-2 flex-1 overflow-hidden">
			<Button variant="link" className="self-start" onClick={handleBack}>
				<ChevronLeft /> Kembali
			</Button>
			<div className="flex gap-2 h-full overflow-hidden">
				<Async state={item} Loading={<Loader2 className="animate-spin" />}>
					{(product) => {
						if (product === null) {
							return <Redirect to="/stock" />;
						}
						const Detail =
							user.role === "user" ? (
								<Info product={product} />
							) : (
								<Form product={product} db={db}  />
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
										<Async state={images} Error={(error) => <TextError>{error}</TextError>}>
											{(images) => (
												<Images
													images={images}
													productId={id}
													role={user.role}
													revalidate={revalidate}
													db={db}
												/>
											)}
										</Async>
									</TabsContent>
								</Tabs>
							</>
						);
					}}
				</Async>
			</div>
		</main>
	);
}
