import { useState } from "react";
import { Await } from "../../../components/Await";
import { useStore } from "../../../Layout";
import { setProfile, useProfile } from "./setting-api";
import { FieldText } from "./FieldText";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/Textarea";
import { Button } from "../../../components/ui/button";
import { TextError } from "../../../components/TextError";
import { Loader2 } from "lucide-react";

export default function Profile() {
	const state = useProfile();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const store = useStore();
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		setLoading(true);
		setProfile(store, {
			owner: (formData.get("owner") as string) ?? undefined,
			desc: (formData.get("desc") as string) ?? undefined,
			address: (formData.get("address") as string) ?? undefined,
			ig: (formData.get("ig") as string) ?? undefined,
			shopee: (formData.get("shopee") as string) ?? undefined,
		})
			.then(() => {
				setError("");
				setLoading(false);
			})
			.catch(() => {
				setError("Ada yang bermasalah.");
				setLoading(false);
			});
	};
	return (
		<Await state={state}>
			{({ address, desc, ig, owner, shopee }) => (
				<div className="flex flex-col gap-2 flex-1 w-full">
					<form onSubmit={handleSubmit} className="flex flex-col gap-2">
						<FieldText label="Nama Toko">
							<Input type="text" defaultValue={owner} name="owner" />
						</FieldText>
						<FieldText label="Alamat">
							<Input type="text" defaultValue={address} name="address" />
						</FieldText>
						<FieldText label="Shopee">
							<Input type="text" defaultValue={shopee} name="shopee" />
						</FieldText>
						<FieldText label="Instagram">
							<Input type="text" defaultValue={ig} name="ig" />
						</FieldText>
						<label className="flex flex-col gap-1 text-3xl">
							<div>
								<span>Deskripsi:</span>
							</div>
							<Textarea name="desc" defaultValue={desc}></Textarea>
						</label>
						<Button>Simpan {loading && <Loader2 className="animate-spin" />}</Button>
						{error === "" ? null : <TextError>{error}</TextError>}
					</form>
				</div>
			)}
		</Await>
	);
}
