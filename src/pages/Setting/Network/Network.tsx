import { useStore } from "~/RootLayout";
import { useNetwork } from "~/pages/setting/Network/use-network";
import { Await } from "~/components/Await";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Password } from "~/components/Password";
import { Panel } from "./Panel";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useConnect } from "../../../hooks/use-connect";

export default function Page() {
	const store = useStore();
	const { state, handleSubmit, loading, error } = useNetwork(store);
	const connection = useConnect(store);
	return (
		<div className="flex flex-col gap-2 w-full flex-1">
			<h2 className="text-4xl font-bold">Jaringan</h2>
			<Await state={state}>
				{(network) => (
					<>
						<form onSubmit={handleSubmit} className="flex p-2 flex-col gap-2">
							<NetworkForm network={network} />
							<div className="justify-between flex">
								<Await state={connection}>{(connected) => <Panel connected={connected} />}</Await>
								<div></div>
								<Button>
									{loading ? <Loader2 className="aniamte-spin" /> : null}
									Sambung
								</Button>
							</div>
							<TextError>{error ?? ""}</TextError>
						</form>
					</>
				)}
			</Await>
		</div>
	);
}

function NetworkForm({
	network,
}: {
	network: {
		url: string;
		name: string;
		password: string;
	};
}) {
	return (
		<div className="grid grid-cols-[200px_1fr] items-center gap-2">
			<Label>URL</Label>
			<Input name="url" defaultValue={network.url} aria-autocomplete="list" />
			<Label>Nama</Label>
			<Input name="name" defaultValue={network.name} aria-autocomplete="list" />
			<Label>Kata Sandi</Label>
			<Password name="password" defaultValue={network.password} aria-autocomplete="list" />
		</div>
	);
}
