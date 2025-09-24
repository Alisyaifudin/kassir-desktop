import { Output } from "../SearchOutput";
import { TextError } from "~/components/TextError";
import { Field } from "../Field";
import { Input } from "~/components/ui/input";
import { useSearch } from "~/pages/Shop/RightPanel/Tab/SearchBar/use-search";
import { useMode } from "~/pages/Shop/use-mode";

export function Search({
	products: allProducts,
	additionals: allAdditionals,
}: {
	products: DB.Product[];
	additionals: DB.AdditionalItem[];
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
	} = useSearch(allProducts, allAdditionals);
	const [mode] = useMode();
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
