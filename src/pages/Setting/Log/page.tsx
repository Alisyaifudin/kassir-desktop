import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { Result } from "~/lib/utils";
import { Form, useActionData, useLoaderData } from "react-router";
import { Loader } from "./loader";
import { Suspense, use } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { useLoading } from "~/hooks/use-loading";
import { Action } from "./action";

export default function Page() {
	const text = useLoaderData<Loader>();
	const loading = useLoading();
	const error = useActionData<Action>();
	return (
		<div className="flex flex-col gap-2 flex-1 text-3xl overflow-hidden">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold">Log</h1>
				<Form method="POST">
					<TextError>{error}</TextError>
					<Button variant="destructive">
						<Spinner when={loading} />
						Bersihkan
					</Button>
				</Form>
			</div>
			<div className="flex flex-col gap-1 bg-black h-full overflow-auto">
				<Suspense fallback={<Loading />}>
					<Log text={text} />
				</Suspense>
			</div>
		</div>
	);
}

function Log({ text: promise }: { text: Promise<Result<"Aplikasi bermasalah", string[]>> }) {
	const [errMsg, text] = use(promise);
	if (errMsg !== null) {
		return <TextError>{errMsg}</TextError>;
	}
	return (
		<>
			{text.map((t, i) => (
				<p className="text-white text-small" key={i}>
					{t}
				</p>
			))}
		</>
	);
}
