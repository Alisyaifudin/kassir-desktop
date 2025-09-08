import { useNavigate, useSearchParams } from "react-router";
import { getBackURL } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import Redirect from "~/components/Redirect";
import { User } from "~/lib/auth";
import { Database } from "~/database";
import { Info } from "./_components/Info";
import { useItem } from "./_hooks/useItem";
import { Async } from "~/components/Async";
import { Form } from "./_components/Form";

export default function Page({ user, id, db }: { id: number; user: User; db: Database }) {
	const navigate = useNavigate();
	const [search] = useSearchParams();
	const item = useItem(id, db);
	const handleBack = () => {
		const backURL = getBackURL("/stock", search);
		navigate(backURL);
	};
	return (
		<main className="py-2 px-5 mx-auto max-w-5xl w-full flex flex-col gap-2 flex-1 overflow-hidden">
			<Button variant="link" className="self-start" onClick={handleBack}>
				<ChevronLeft /> Kembali
			</Button>
			<div className="flex gap-2 h-full max-h-[calc(100vh-170px)] overflow-hidden">
				<Async state={item} Loading={<Loader2 className="animate-spin" />}>
					{(product) => {
						if (product === null) {
							return <Redirect to="/stock" />;
						}
						if (user.role === "user") {
							return <Info product={product} />;
						}
						return <Form product={product} db={db} />;
					}}
				</Async>
			</div>
		</main>
	);
}
