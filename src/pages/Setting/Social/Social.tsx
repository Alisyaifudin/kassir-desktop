import { Item } from "./_components/Item";
import { NewBtn } from "./_components/NewItem";
import { useSocials } from "./_hooks/use-socials";
import { Database } from "~/database";
import { Async } from "~/components/Async";
import { ForEach } from "~/components/ForEach";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

const grid = {
	big: {
		gridTemplateColumns: "250px 1fr",
	},
	small: {
		gridTemplateColumns: "200px 1fr",
	},
};

export default function Shop({ db }: { db: Database }) {
	const [state, revalidate] = useSocials(db);
	const size = useSize();
	return (
		<div className="flex flex-col gap-2 w-full flex-1 overflow-auto">
			<h1 style={style[size].h1} className="font-bold">
				Daftar Kontak
			</h1>
			<div style={grid[size]} className="grid gap-2 items-center text-3xl">
				<p style={style[size].text}>Kontak</p>
				<p style={style[size].text}>Isian</p>
			</div>
			<Async state={state}>
				{(socials) => {
					if (socials.length === 0) {
						return <p style={style[size].h1}>---Belum Ada---</p>;
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
