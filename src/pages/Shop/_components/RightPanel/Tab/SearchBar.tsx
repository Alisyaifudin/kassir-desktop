import { Output } from "./SearchOutput";
import { TextError } from "~/components/TextError";
import { Field } from "./Field";
import { Input } from "~/components/ui/input";
import { useSearch } from "~/pages/shop/_hooks/use-search";
import { LocalContext } from "~/pages/shop/_hooks/use-local-state";

export function Search({
	mode,
	products: all,
	context,
}: {
	mode: DB.Mode;
	products: DB.Product[];
	context: LocalContext;
}) {
	const { handleChange, handleClick, handleSubmit, query, error, products, ref } = useSearch(
		all,
		context
	);
	return (
		<>
			<form onSubmit={handleSubmit} className="flex items-end gap-1 px-1">
				<Field label="Cari">
					<Input ref={ref} type="search" value={query} onChange={handleChange} aria-autocomplete="list" />
				</Field>
			</form>
			{error ? <TextError>{error}</TextError> : null}
			<Output products={products} handleClick={handleClick} mode={mode} />
		</>
	);
}
