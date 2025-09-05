import { useParams } from "./use-params";

export function useInterval(productsLength: number) {
	const { get } = useParams();
	const { pageProduct, pageAdditional, limit, tab } = get;
	const totalItem = productsLength;
	const totalPage = Math.ceil(totalItem / limit);
	const rawPage = tab === "product" ? pageProduct : pageAdditional;
	const page = rawPage > totalPage ? totalPage : rawPage;
	const start = limit * (page - 1);
	const end = limit * page;
	return { start, end, totalPage };
}
