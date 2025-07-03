import { useGetRecords } from "./_hooks/use-get-records";
import { Header } from "./_components/Header";
import { Record } from "./_components/Record";
import { Database } from "~/database";
import { Async } from "~/components/Async";
import { useFetchMethods } from "./_hooks/use-methods";
import { useSearchParams } from "react-router";
import { getParam } from "./_utils/params";

export type Context = {
	db: Database;
	toast: (text: string) => void;
};

export default function Page(props: Context) {
	const [state] = useFetchMethods(props.db);
	return <Async state={state}>{(methods) => <Wrapper methods={methods} context={props} />}</Async>;
}

export function Wrapper({ methods, context }: { methods: DB.Method[]; context: Context }) {
	const [search] = useSearchParams();
	const { time } = getParam(search).time;
	const [state, revalidate] = useGetRecords(time, context);
	return (
		<main className="flex flex-col gap-2 p-2 flex-1 text-3xl overflow-hidden">
			<Header methods={methods} context={context} />
			<Async state={state}>
				{({ additionals, discounts, items, records }) => {
					return (
						<Record
							items={items}
							methods={methods}
							additionals={additionals}
							discounts={discounts}
							records={records}
							revalidate={revalidate}
							context={context}
						/>
					);
				}}
			</Async>
		</main>
	);
}
