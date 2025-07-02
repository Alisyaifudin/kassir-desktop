import { Item } from "./_components/Item";
import { NewBtn } from "./_components/NewItem";
import { useSocials } from "./_hooks/use-socials";
import { Database } from "~/database";
import { Async } from "~/components/Async";
import { ForEach } from "~/components/ForEach";

export default function Shop({ db }: { db: Database }) {
	const [state, revalidate] = useSocials(db);
	return (
		<div className="flex flex-col gap-2 w-full flex-1">
			<h1 className="text-4xl font-bold">Daftar Kontak</h1>
			<div className="grid grid-cols-[250px_1fr] gap-2 items-center text-3xl">
				<p>Kontak</p>
				<p>Isian</p>
			</div>
			<Async state={state}>
				{(socials) => {
					if (socials.length === 0) {
						return <p className="text-3xl">---Belum Ada---</p>;
					}
					return (
						<ForEach items={socials}>
							{(s) => (
								<Item id={s.id} name={s.name} value={s.value} revalidate={revalidate} db={db} />
							)}
						</ForEach>
					);
				}}
			</Async>
			<NewBtn revalidate={revalidate} db={db} />
		</div>
	);
}
