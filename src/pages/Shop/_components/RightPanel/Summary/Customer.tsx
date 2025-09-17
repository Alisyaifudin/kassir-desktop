import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { User, X } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { LocalContext } from "~/pages/shop/_hooks/use-local-state";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useCustomer } from "~/pages/Shop/_hooks/use-customer";
import { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useFetch } from "~/hooks/useFetch";
import { useDB } from "~/hooks/use-db";
import { Async } from "~/components/Async";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";

export function Customer({ context }: { context: LocalContext }) {
	const db = useDB();
	const fetch = useCallback(() => db.customer.get.all(), []);
	const [state] = useFetch(fetch);
	return (
		<Async state={state}>
			{(customers) => <Wrapper customers={customers} context={context} />}
		</Async>
	);
}

function Wrapper({ context, customers }: { customers: DB.Customer[]; context: LocalContext }) {
	const [customer] = useCustomer(context);
	const tab = customer.isNew ? "man" : "auto";
	return (
		<Dialog>
			<Button asChild variant="secondary">
				<DialogTrigger type="button">
					<User />
				</DialogTrigger>
			</Button>
			<DialogContent className="min-w-6xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Pelanggan</DialogTitle>
				</DialogHeader>
				<Tabs
					defaultValue={tab}
					className="w-full grow shrink basis-0 h-[500px] items-start flex flex-col overflow-hidden"
				>
					<div className="flex items-center justify-between w-full">
						<TabsList>
							<TabsTrigger value="auto">Cari</TabsTrigger>
							<TabsTrigger value="man">Baru</TabsTrigger>
						</TabsList>
					</div>
					<TabBtn value="auto">
						<AutoCustomer customers={customers} context={context} />
					</TabBtn>
					<TabBtn value="man">
						<NewCustomer context={context} customers={customers} />
					</TabBtn>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
function TabBtn({ children, value }: { children: React.ReactNode; value: string }) {
	return (
		<TabsContent
			value={value}
			className="flex overflow-hidden w-full flex-col px-1 gap-2 grow shrink basis-0"
		>
			{children}
		</TabsContent>
	);
}

function NewCustomer({ context, customers }: { context: LocalContext; customers: DB.Customer[] }) {
	const [customer, setCustomer] = useCustomer(context);
	const [name, setName] = useState(customer.isNew ? customer.name : "");
	const [phone, setPhone] = useState(customer.isNew ? customer.phone : "");
	const [error, setError] = useState("");
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (ref.current === null) return;
		ref.current.focus();
	}, []);
	const debouncedPhone = useDebouncedCallback(
		(phone: string) =>
			setCustomer({
				name,
				phone,
				isNew: true,
			}),
		DEBOUNCE_DELAY
	);
	const handleChangePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.currentTarget.value;
		setPhone(val);
		if (customers.find((c) => c.phone === val) !== undefined) {
			debouncedPhone("");
			setError("No hp sudah terpakai.");
		} else {
			debouncedPhone(e.currentTarget.value);
			setError("");
		}
	};
	const debouncedName = useDebouncedCallback(
		(name: string) =>
			setCustomer({
				name,
				phone,
				isNew: true,
			}),
		DEBOUNCE_DELAY
	);
	const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
		setName(e.currentTarget.value);
		debouncedName(e.currentTarget.value);
	};
	return (
		<div className="grid grid-cols-[100px_1fr] items-center gap-2">
			<Label htmlFor="customer-name">Nama</Label>
			<Input
				aria-autocomplete="list"
				ref={ref}
				value={name}
				onChange={handleChangeName}
				id="customer-name"
			/>
			<Label htmlFor="customer-hp">HP</Label>
			<Input aria-autocomplete="list" value={phone} onChange={handleChangePhone} id="customer-hp" />
			<Show when={error !== ""}>
				<p className="col-span-2 text-red-500 text-3xl">{error}</p>
			</Show>
		</div>
	);
}

function AutoCustomer({
	context,
	customers: all,
}: {
	context: LocalContext;
	customers: DB.Customer[];
}) {
	const [customer, setCustomer] = useCustomer(context);
	const [query, setQuery] = useState("");
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (ref.current === null) return;
		ref.current.focus();
	}, []);
	let customers: DB.Customer[] = [];
	if (query.trim() !== "") {
		const q = query.toLowerCase().trim();
		customers = all.filter(
			(c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
		);
	}
	function handleSelect(name: string, phone: string) {
		return function () {
			setCustomer({ name, phone, isNew: false });
			setQuery("");
		};
	}
	function handleUnselect() {
		setCustomer({ name: "", phone: "", isNew: false });
	}
	return (
		<div className="flex flex-col gap-2 overflow-hidden">
			<Input
				ref={ref}
				placeholder="Nama atau hp"
				aria-autocomplete="list"
				value={query}
				onChange={(e) => setQuery(e.currentTarget.value)}
				type="search"
			/>
			<Show when={!customer.isNew && customer.name.trim() !== "" && customer.phone.trim() !== ""}>
				<div className="flex gap-3 items-center justify-between">
					<div className="flex-1 flex items-center justify-between">
						<p className="text-3xl font-bold">{customer.name}</p>
						<p className="text-3xl font-bold">{customer.phone}</p>
					</div>
					<button type="button" onClick={handleUnselect}>
						<X size={35} />
					</button>
				</div>
			</Show>
			<ul className="flex flex-col gap-2 overflow-auto">
				<ForEach items={customers}>
					{(customer) => (
						<li className="flex w-full">
							<Button
								type="button"
								variant="ghost"
								onClick={handleSelect(customer.name, customer.phone)}
								className="flex items-center justify-between w-full h-10"
							>
								<p className="text-3xl font-normal">{customer.name}</p>
								<p className="text-3xl font-normal">{customer.phone}</p>
							</Button>
						</li>
					)}
				</ForEach>
			</ul>
		</div>
	);
}
