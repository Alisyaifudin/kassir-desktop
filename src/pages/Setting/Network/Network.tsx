import { useStore } from "~/RootLayout";
import { useNetwork } from "~/hooks/useNetwork";
import { Await } from "~/components/Await";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Password } from "~/components/Password";
import { useAccount } from "./use-account";
import { useEffect, useState } from "react";
import { Panel } from "./Panel";

export default function Page() {
	const [option, setOption] = useState({
		name: "",
		password: "",
		url: "",
	});
	const store = useStore();
	const network = useNetwork(store);
	const account = useAccount(store);
	return (
		<div className="flex flex-col gap-2 w-full flex-1">
			<h2 className="text-4xl font-bold">Jaringan</h2>
			<form onSubmit={network.handleSubmit} className="flex flex-col gap-2">
				<Await state={network.state}>
					{(network) => <NetworkForm network={network} setOption={setOption} />}
				</Await>
			</form>
			<hr />
			<form onSubmit={account.handleSubmit} className="flex flex-col gap-2">
				<Await state={account.state}>
					{(account) => <AccountForm account={account} setOption={setOption} />}
				</Await>
				<Button className="self-end">Simpan</Button>
			</form>
			<hr />
			<Panel option={option} />
		</div>
	);
}

function AccountForm({
	account,
	setOption,
}: {
	account: { name: string; password: string };
	setOption: React.Dispatch<
		React.SetStateAction<{
			name: string;
			password: string;
			url: string;
		}>
	>;
}) {
	useEffect(() => {
		setOption((o) => ({ ...o, name: account.name, password: account.password }));
	}, []);
	return (
		<div className="grid grid-cols-[200px_1fr] items-center gap-2">
			<Label>Nama</Label>
			<Input className="flex-1" name="name" defaultValue={account.name} aria-autocomplete="list" />
			<Label>Kata Sandi</Label>
			<Password
				className="flex-1"
				name="password"
				defaultValue={account.password}
				aria-autocomplete="list"
			/>
		</div>
	);
}

function NetworkForm({
	network,
	setOption,
}: {
	network: string;
	setOption: React.Dispatch<
		React.SetStateAction<{
			name: string;
			password: string;
			url: string;
		}>
	>;
}) {
	useEffect(() => {
		setOption((o) => ({ ...o, url: network }));
	}, []);
	return (
		<div className="flex items-center gap-2">
			<Label className="w-[200px]">URL</Label>
			<Input className="flex-1" name="network" defaultValue={network} aria-autocomplete="list" />
			<Button>Simpan</Button>
		</div>
	);
}
