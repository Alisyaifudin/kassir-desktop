import { Output } from "./SearchOutput";
import { TextError } from "~/components/TextError";
import { Field } from "./Field";
import { Input } from "~/components/ui/input";
import { useSearch } from "~/pages/shop/_hooks/use-search";
import { LocalContext } from "~/pages/shop/_hooks/use-local-state";

export function Search({
	mode,
	products: allProducts,
	additionals: allAdditionals,
	context,
}: {
	mode: DB.Mode;
	products: DB.Product[];
	additionals: DB.AdditionalItem[];
	context: LocalContext;
}) {
	const {
		handleChange,
		handleClickProduct,
		handleClickAdditional,
		handleSubmit,
		query,
		error,
		products,
		additionals,
		ref,
	} = useSearch(allProducts, allAdditionals, context);
	return (
		<>
			<form onSubmit={handleSubmit} className="flex items-end gap-1 px-1">
				<Field label="Cari">
					<Input
						ref={ref}
						type="search"
						value={query}
						onChange={handleChange}
						aria-autocomplete="list"
					/>
				</Field>
			</form>
			{error ? <TextError>{error}</TextError> : null}
			<Output
				products={products}
				handleClickProduct={handleClickProduct}
				additionals={additionals}
				handleClickAdditional={handleClickAdditional}
				mode={mode}
			/>
		</>
	);
}
