import { Button } from "~/components/ui/button";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function UserPanel() {
	const size = useSize();
	return (
		<ol className="flex flex-col gap-2 shadow-md">
			<li className="flex items-center">
				<Button style={style[size].text} className="w-full">
					Profil
				</Button>
			</li>
		</ol>
	);
}
