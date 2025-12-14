import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { Name } from "./Name";
import { PasswordForm } from "./PasswordForm";

export default function Page() {
	const { size, name } = useLoaderData<Loader>();
	return (
		<div className="flex flex-col gap-2 p-5 flex-1 text-3xl justify-between">
			<Name name={name}></Name>
			<PasswordForm size={size} />
		</div>
	);
}
