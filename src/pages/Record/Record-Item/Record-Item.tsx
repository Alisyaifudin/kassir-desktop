import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Receipt } from "./_components/Receipt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Detail } from "./_components/Detail";
import { Data, useRecord } from "./_hooks/use-record";
import { useTab } from "./_hooks/use-tab";
import { Async } from "~/components/Async";
import { Link } from "react-router";
import { Profile } from "~/lib/store";
import type { Context } from ".";
import { memo } from "react";

export default function Page({ timestamp, context }: { timestamp: number; context: Context }) {
	const [state, revalidate] = useRecord(timestamp, context);
	return (
		<main className="flex flex-col gap-2 p-2 overflow-y-auto">
			<Async state={state}>
				{([data, profile, socials, methods]) => (
					<Wrapper
						data={data}
						revalidate={revalidate}
						profile={profile}
						socials={socials}
						context={context}
						methods={methods}
					/>
				)}
			</Async>
		</main>
	);
}

const Wrapper = memo(function ({
	data,
	revalidate,
	profile,
	socials,
	context,
	methods,
}: {
	data: Data;
	revalidate: () => void;
	profile: Profile;
	socials: DB.Social[];
	methods: DB.Method[];
	context: Context;
}) {
	const [tab, setTab, urlBack] = useTab(data.record.timestamp, data.record.mode);
	return (
		<>
			<div className="flex items-center gap-2">
				<Button asChild variant="link" className="self-start">
					<Link to={urlBack}>
						<ChevronLeft /> Kembali
					</Link>
				</Button>
			</div>
			<Tabs value={tab} onValueChange={(val) => setTab(val)}>
				<TabsList>
					<TabsTrigger value="receipt">Struk</TabsTrigger>
					<TabsTrigger value="detail">Detail</TabsTrigger>
				</TabsList>
				<TabsContent value="receipt">
					<Receipt data={data} profile={profile} socials={socials} />
				</TabsContent>
				<TabsContent value="detail">
					<Detail
						role={context.user.role}
						data={data}
						context={{ db: context.db }}
						methods={methods}
						revalidate={revalidate}
						showCashier={profile.showCashier === "true"}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
});
