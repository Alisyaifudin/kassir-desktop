import { Database } from "~/database";
import { useCredit } from "../../_hooks/use-credit";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { memo } from "react";

export const ToCreditBtn = memo(function ({
	timestamp,
	close,
	credit,
	context,
}: {
	timestamp: number;
	close: () => void;
	credit: 0 | 1;
	context: { db: Database };
}) {
	const { loading, error, handleClick } = useCredit(timestamp, close, context);
	if (credit === 1) return null;
	return (
		<div className="flex flex-col gap-1">
			<Button variant="destructive" className="w-fit" onClick={handleClick}>
				Ubah jadi kredit
				<Spinner when={loading} />
			</Button>
			<TextError>{error}</TextError>
		</div>
	);
});
