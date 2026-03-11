import { Search } from "./Search";

export function SearchBars() {
	return (
		<div className="flex gap-2 flex-1 pl-4">
			<Search />
			{/* <form onSubmit={handleSubmit} className="flex gap-2 items-center">
				<Spinner when={loading} />
				<p>No:</p>
				<div className="flex flex-col gap-1">
					<Input type="search" placeholder="Cari catatan" name="no" aria-autocomplete="list" />
					<TextError>{error}</TextError>
				</div>
			</form> */}
		</div>
	);
}

// function useSearchNo() {

// const [loading, setLoading] = useState(false);
// const [error, setError] = useState("");
// const [, setSearch] = useSearchParams();
// async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
// 	e.preventDefault();
// 	const formdata = new FormData(e.currentTarget);
// 	const timestamp = formdata.get("no") as string;
// 	setLoading(true);
// 	const res = await fetch(`/record/search/${timestamp}`);
// 	if (res.status >= 400) {
// 		setLoading(false);
// 		setError("Aplikasi bermasalah");
// 		return;
// 	}
// 	const raw = (await res.json()) as SearchRes;
// 	setLoading(false);
// 	if ("error" in raw) {
// 		setError(raw.error);
// 		return;
// 	}
// 	const data = raw.data;
// 	if (data === null) {
// 		setError("");
// 		return;
// 	}
// 	setSearch((prev) => {
// 		const search = new URLSearchParams(prev);
// 		search.set("mode", data.mode);
// 		search.set("timestamp", data.timestamp.toString());
// 		search.set("selected", data.timestamp.toString());
// 		return search;
// 	});
// }
// }
