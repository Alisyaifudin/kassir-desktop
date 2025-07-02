import { useProfile } from "./_hooks/use-profile";
import { FieldText } from "./_components/FieldText";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { FieldDesc } from "./_components/FieldDesc";
import { useEdit } from "./_hooks/use-edit";
import { useCheckbox } from "./_hooks/use-checkbox";
import { Spinner } from "~/components/Spinner";
import { Store } from "~/lib/store";
import { Async } from "~/components/Async";
import { memo } from "react";

export default function Shop({
	refetchName,
	context,
}: {
	refetchName: () => void;
	context: { store: Store };
}) {
	const state = useProfile(context);
	return (
		<Async state={state}>
			{({ address, header, owner, footer, showCashier }) => (
				<div className="flex flex-col gap-2 flex-1 w-full">
					<Form context={context} refetchName={refetchName}>
						<FormFields header={header} address={address} footer={footer} owner={owner} />
					</Form>
					<CheckboxForm showCashier={showCashier === "true"} context={context} />
				</div>
			)}
		</Async>
	);
}

const Form = memo(function ({
	context,
	refetchName,
	children,
}: {
	children?: React.ReactNode;
	context: { store: Store };
	refetchName: () => void;
}) {
	const { handleSubmit, loading, error } = useEdit(refetchName, context);
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			{children}
			<TextError>{error}</TextError>
			<Button>
				Simpan <Spinner when={loading} />
			</Button>
		</form>
	);
});

const FormFields = memo(function ({
	owner,
	address,
	footer,
	header,
}: {
	owner?: string;
	address?: string;
	header?: string;
	footer?: string;
}) {
	return (
		<>
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
		</>
	);
});

const CheckboxForm = memo(function ({
	context,
	showCashier,
}: {
	showCashier: boolean;
	context: { store: Store };
}) {
	const { loading, error, handleChangeShowCashier } = useCheckbox(context);
	return (
		<>
			<Label className="text-3xl flex items-center gap-3">
				<span>Tampilkan Nama Kasir</span>
				<Checkbox defaultChecked={showCashier} onCheckedChange={handleChangeShowCashier} />
				<Spinner when={loading} />
			</Label>
			<TextError>{error}</TextError>
		</>
	);
});
