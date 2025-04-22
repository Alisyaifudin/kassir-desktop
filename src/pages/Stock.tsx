import { LoaderFunctionArgs, useLoaderData } from "react-router";
import Database from "@tauri-apps/plugin-sql";

export async function loader({}: LoaderFunctionArgs) {
	const db = await Database.load("sqlite:mydatabase.db");
	const result = await db.select("SELECT * FROM items");
	return { result };
}

export default function Page() {
	const { result } = useLoaderData<typeof loader>();
	return (
		<main>
			<a href="/stock/new">New</a>
			<div>{JSON.stringify(result)}</div>
		</main>
	);
}
