import { AwaitDangerous } from "../../../components/Await";
import { useStore } from "../../../RootLayout";
import { setProfile, useProfile } from "./setting-api";
import { FieldText } from "./FieldText";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Button } from "../../../components/ui/button";
import { TextError } from "../../../components/TextError";
import { Loader2 } from "lucide-react";
import { emitter } from "../../../lib/event-emitter";
import { useAction } from "~/hooks/useAction";
import { z } from "zod";
import { log } from "~/lib/utils";

const schema = z.object({
	owner: z.string(),
	header: z.string(),
	footer: z.string(),
	address: z.string(),
	ig: z.string(),
	shopee: z.string(),
});

export default function Shop() {
	const state = useProfile();
	const { profile } = useStore();
	const { action, loading, error, setError } = useAction(
		"",
		async (data: z.infer<typeof schema>) => {
			await setProfile(profile, data);
			return null;
		}
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = schema.safeParse({
			owner: formData.get("owner"),
			header: formData.get("header"),
			footer: formData.get("footer"),
			address: formData.get("address"),
			ig: formData.get("ig"),
			shopee: formData.get("shopee"),
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			log.error(JSON.stringify(errs));
			setError("Ada yang invalid. Cek lagi.");
			return;
		}
		await action(parsed.data);
		emitter.emit("refresh");
	};
	return (
		<AwaitDangerous state={state}>
			{({ address, header, owner, footer }) => (
				<div className="flex flex-col gap-2 flex-1 w-full">
					<form onSubmit={handleSubmit} className="flex flex-col gap-2">
						<FieldText label="Nama Toko">
							<Input type="text" defaultValue={owner} name="owner" />
						</FieldText>
						<FieldText label="Alamat">
							<Input type="text" defaultValue={address} name="address" />
						</FieldText>
						<label className="flex flex-col gap-1 text-3xl">
							<div>
								<span>Deskripsi Atas:</span>
							</div>
							<Textarea className="h-[120px]" name="header" defaultValue={header}></Textarea>
						</label>
						<label className="flex flex-col gap-1 text-3xl">
							<div>
								<span>Deskripsi Bawah:</span>
							</div>
							<Textarea className="h-[120px]" name="footer" defaultValue={footer}></Textarea>
						</label>
						<Button>Simpan {loading && <Loader2 className="animate-spin" />}</Button>
						{error ? <TextError>{error}</TextError> : null}
					</form>
				</div>
			)}
		</AwaitDangerous>
	);
}

{/* <FieldText label="Shopee">
							<Input type="text" defaultValue={shopee} name="shopee" />
						</FieldText>
						<FieldText label="Instagram">
							<Input type="text" defaultValue={ig} name="ig" />
						</FieldText> */}