import { useProfile } from "./_hooks/use-profile";
import { FieldText } from "./_components/FieldText";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { FieldDesc } from "./_components/FieldDesc";
import { useEdit } from "./_hooks/use-edit";
import { Spinner } from "~/components/Spinner";
import { Store } from "~/lib/store";
import { Async } from "~/components/Async";
import { memo } from "react";
import { CheckboxForm } from "./_components/CashierNameCheckbox";
import { SelectSize } from "./_components/SelectSize";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export default function Shop({
	refetchName,
	context,
}: {
	refetchName: () => void;
	context: { store: Store };
}) {
	const state = useProfile(context);
	const size = useSize();
	return (
		<Async state={state}>
			{({ address, header, owner, footer, showCashier }) => (
				<div className="flex flex-col gap-2 flex-1 w-full overflow-auto">
					<Form size={size} context={context} refetchName={refetchName}>
						<FormFields
							size={size}
							header={header}
							address={address}
							footer={footer}
							owner={owner}
						/>
					</Form>
					<CheckboxForm showCashier={showCashier === "true"} context={context} />
					<SelectSize size={size} context={context} />
				</div>
			)}
		</Async>
	);
}

const Form = memo(function ({
	context,
	refetchName,
	children,
	size,
}: {
	children?: React.ReactNode;
	context: { store: Store };
	refetchName: () => void;
	size: "big" | "small";
}) {
	const { handleSubmit, loading, error } = useEdit(refetchName, context);
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2">
			{children}
			<TextError style={style[size].text}>{error}</TextError>
			<Button style={style[size].text}>
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
	size
}: {
	owner?: string;
	address?: string;
	header?: string;
	footer?: string;
	size: "big" | "small";
}) {
	return (
		<>
			<FieldText size={size} label="Nama Toko">
				<Input style={style[size].text} type="text" defaultValue={owner} name="owner" aria-autocomplete="list" />
			</FieldText>
			<FieldText size={size} label="Alamat">
				<Input style={style[size].text} type="text" defaultValue={address} name="address" aria-autocomplete="list" />
			</FieldText>
			<FieldDesc size={size} label="Deskripsi Atas:">
				<Textarea style={style[size].text} className="h-[120px]" name="header" defaultValue={header}></Textarea>
			</FieldDesc>
			<FieldDesc size={size} label="Deskripsi Bawah:">
				<Textarea style={style[size].text} className="h-[120px]" name="footer" defaultValue={footer}></Textarea>
			</FieldDesc>
		</>
	);
});
