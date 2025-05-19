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
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";

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
	const {profile, checkbox} = useActions()
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
			profile.setError("Ada yang invalid. Cek lagi.");
			return;
		}
		await profile.action(parsed.data);
		emitter.emit("refresh");
	};
	const handleChangeShowCashier = async (e: CheckedState) => {
		await checkbox.action(e);
	};
	return (
		<AwaitDangerous state={state}>
			{({ address, header, owner, footer, showCashier }) => (
				<div className="flex flex-col gap-2 flex-1 w-full">
					<form onSubmit={handleSubmit} className="flex flex-col gap-2">
						<FieldText label="Nama Toko">
							<Input type="text" defaultValue={owner} name="owner" aria-autocomplete="list" />
						</FieldText>
						<FieldText label="Alamat">
							<Input type="text" defaultValue={address} name="address" aria-autocomplete="list" />
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
						<Label className="text-3xl flex items-center gap-3">
							<span>Tampilkan Nama Kasir</span>
							<Checkbox defaultChecked={showCashier === "true"} onCheckedChange={handleChangeShowCashier} />
						</Label>
						<Button>Simpan {profile.loading && <Loader2 className="animate-spin" />}</Button>
						{profile.error ? <TextError>{profile.error}</TextError> : null}
					</form>
				</div>
			)}
		</AwaitDangerous>
	);
}

function useActions() {
	const store = useStore();
	const profile = useAction("", async (data: z.infer<typeof schema>) => {
		await setProfile(store.profile, data);
		return null;
	});
	const checkbox = useAction("", (check: CheckedState) =>
		setProfile(store.profile, {
			showCashier: check ? "true" : "false",
		})
	);
	return { profile, checkbox };
}
