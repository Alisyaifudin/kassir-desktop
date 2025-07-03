import { formatDate } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { useDownloadRecord } from "../_hooks/use-download-records";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";

export default function Record({db}: {db: Database}) {
	const { startOfMonth, endOfMonth, handleDownload, loading, error } = useDownloadRecord(db);
	return (
		<div className="flex gap-2 flex-col p-2 bg-sky-50">
			<div className="flex gap-2 items-center justify-between ">
				<h3 className="italic">Riwayat</h3>
			</div>
			<form onSubmit={handleDownload} className="text-2xl flex justify-between items-end">
				<div className="flex gap-3 items-end">
					<label className="flex flex-col gap-1">
						<span>Dari:</span>
						<Input type="date" name="start" defaultValue={formatDate(startOfMonth)} aria-autocomplete="list" />
					</label>
					<div className="h-12">&mdash;</div>
					<label className="flex flex-col gap-1">
						<span>Sampai:</span>
						<Input type="date" name="end" defaultValue={formatDate(endOfMonth)} aria-autocomplete="list" />
					</label>
				</div>
				<Button>
					Unduh <Spinner when={loading} />
				</Button>
			</form>
			<TextError>{error}</TextError>
		</div>
	);
}
