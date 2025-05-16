import { useDB } from "~/RootLayout";
import { useAsync } from "~/hooks/useAsync";
import { Await } from "~/components/Await";
import { Item } from "./Item";
import { NewBtn } from "./NewItem";

export default function Shop() {
	const state = useSocials();
	return (
		<div className="flex flex-col gap-2 w-full flex-1">
			<h1 className="text-4xl font-bold">Daftar Kontak</h1>
			<div className="grid grid-cols-[250px_1fr] gap-2 items-center text-3xl">
				<p>Kontak</p>
				<p>Isian</p>
			</div>
			<Await state={state}>
				{(socials) => {
					if (socials.length === 0) {
						return <p className="text-3xl">---Belum Ada---</p>;
					}
					return (
						<>
							{socials.map((s) => (
								<Item key={s.id} id={s.id} name={s.name} value={s.value} />
							))}
						</>
					);
				}}
			</Await>
			<NewBtn />
		</div>
	);
}

function useSocials() {
	const db = useDB();
	const state = useAsync(() => db.social.get(), ["fetch-social"]);
	return state;
}