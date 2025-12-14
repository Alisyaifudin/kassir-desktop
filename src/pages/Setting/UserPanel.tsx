import { Button } from "~/components/ui/button";

export function UserPanel() {
	return (
		<ol className="flex flex-col gap-2 shadow-md">
			<li className="flex items-center">
				<Button className="w-full">Profil</Button>
			</li>
		</ol>
	);
}
