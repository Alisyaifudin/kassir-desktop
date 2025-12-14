import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Receipt } from "./Receipt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Detail } from "./Detail";
import { useTab } from "./use-tab";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { Loader } from "./loader";
import { getURLBack } from "./utils";
import { cn, sizeClass } from "~/lib/utils";

export default function Page() {
	const { info, role, data, socials, methods, products } = useLoaderData<Loader>();
	const method = getMethod(methods, data.record.method_id);
	const [tab, setTab] = useTab();
	const [search] = useSearchParams();
	const urlBack = getURLBack(data.record.timestamp, data.record.mode, search);
	return (
		<main className={cn("flex flex-col gap-2 p-2 overflow-y-auto", sizeClass[info.size])}>
			<div className="flex items-center gap-2">
				<Button asChild variant="link" className="self-start">
					<Link to={urlBack}>
						<ChevronLeft className="icon" /> Kembali
					</Link>
				</Button>
			</div>
			<Tabs value={tab} onValueChange={(val) => setTab(val)}>
				<TabsList className="h-fit">
					<TabsTrigger className="text-big" value="receipt">
						Struk
					</TabsTrigger>
					<TabsTrigger className="text-big" value="detail">
						Detail
					</TabsTrigger>
				</TabsList>
				<TabsContent value="receipt">
					<Receipt method={method} data={data} info={info} socials={socials} />
				</TabsContent>
				<TabsContent value="detail">
					<Detail
						products={products}
						method={method}
						size={info.size}
						role={role}
						data={data}
						methods={methods}
						showCashier={info.showCashier}
					/>
				</TabsContent>
			</Tabs>
		</main>
	);
}

const defaultMethod = {
	id: 1000,
	name: null,
	method: "cash",
} as const;

function getMethod(methods: DB.Method[], methodId: number): DB.Method {
	const method = methods.find((m) => m.id === methodId);
	return method ?? defaultMethod;
}
