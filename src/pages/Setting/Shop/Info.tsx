import { memo } from "react";
import { Form } from "react-router";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Action } from "./action";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";

export const Info = memo(function ({
	owner,
	address,
	footer,
	header,
}: {
	owner: string;
	address: string;
	header: string;
	footer: string;
}) {
	const loading = useLoading();
	const error = useAction<Action>()("info");
	return (
		<Form method="POST" className="flex flex-col gap-2">
			<input type="hidden" name="action" value="info"></input>
			<FieldText label="Nama Toko">
				<Input type="text" defaultValue={owner} name="owner" aria-autocomplete="list" />
			</FieldText>
			<FieldText label="Alamat">
				<Input type="text" defaultValue={address} name="address" aria-autocomplete="list" />
			</FieldText>
			<FieldDesc label="Deskripsi Atas:">
				<Textarea className="h-[120px]" name="header" defaultValue={header}></Textarea>
			</FieldDesc>
			<FieldDesc label="Deskripsi Bawah:">
				<Textarea className="h-[120px]" name="footer" defaultValue={footer}></Textarea>
			</FieldDesc>
			<TextError>{error}</TextError>
			<Button>
				Simpan <Spinner when={loading} />
			</Button>
		</Form>
	);
});

function FieldText({ children, label }: { children: React.ReactNode; label: string }) {
	return (
		<label className="grid grid-cols-[160px_10px_1fr] text-normal items-center gap-1">
			<span>{label}</span>:{children}
		</label>
	);
}
function FieldDesc({ children, label }: { label: string; children: React.ReactNode }) {
	return (
		<label className="flex flex-col gap-1 text-normal">
			<div>
				<span>{label}</span>
			</div>
			{children}
		</label>
	);
}
