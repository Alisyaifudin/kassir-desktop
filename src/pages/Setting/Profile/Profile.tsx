import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { TextError } from "~/components/TextError";
import { useEditName } from "./_hooks/use-edit-name";
import { useEditPassword } from "./_hooks/use-edit-password";
import { Spinner } from "~/components/Spinner";
import { User } from "~/lib/auth";
import { Database } from "~/database";
import { Store } from "~/lib/store";
import { Password } from "~/components/Password";

export default function Profile({
	context,
}: {
	context: { user: User; db: Database; store: Store };
}) {
	const password = useEditPassword(context);
	const name = useEditName(context);
	return (
		<div className="flex flex-col gap-2 p-5 flex-1 text-3xl justify-between">
			<form onSubmit={name.handleChange} className="flex-col gap-2 flex">
				<label className="grid grid-cols-[150px_1fr] gap-2 items-center">
					<span>Nama</span>
					<Input defaultValue={context.user.name} name="name" required aria-autocomplete="list" />
				</label>
				<Button className="w-fit self-end">
					Simpan <Spinner when={name.loading} />
				</Button>
				<TextError>{name.error}</TextError>
			</form>
			<Accordion type="single" collapsible className="bg-red-400 text-white">
				<AccordionItem value="item-1">
					<AccordionTrigger className="font-bold text-3xl px-2">Ganti kata sandi</AccordionTrigger>
					<AccordionContent>
						<form onSubmit={password.handleChange} className="flex-col gap-2 flex px-2 text-3xl">
							<label className="grid grid-cols-[250px_1fr] gap-2 items-center">
								<span>Kata Sandi Baru</span>
								<Password name="password" aria-autocomplete="list" />
							</label>
							<Button className="w-fit self-end">
								Simpan <Spinner when={password.loading} />
							</Button>
							<TextError>{password.error}</TextError>
						</form>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
