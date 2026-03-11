import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { memo, useEffect } from "react";
import { useAction } from "~/hooks/use-action";
import { useLoading } from "~/hooks/use-loading";
import { Action } from "../action";
import { Form } from "react-router";

export const ToCreditBtn = memo(function ({ close }: { close: () => void }) {
	const loading = useLoading();
	const error = useAction<Action>()("to-credit");
	useEffect(() => {
		if (error !== undefined && !loading) {
			close();
		}
	}, [error, loading]);
	return (
		<Form method="POST" className="flex flex-col gap-1">
			<input type="hidden" name="action" value="to-credit"></input>
			<Button variant="destructive" className="w-fit">
				Ubah jadi kredit
				<Spinner when={loading} />
			</Button>
			<TextError>{error}</TextError>
		</Form>
	);
});
