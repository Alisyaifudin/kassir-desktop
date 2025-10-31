import { test, expect } from "bun:test";
import { screen, render } from "@testing-library/react";
import { Sort } from "../_components/Sort";

test("Can use Testing Library", () => {
	render(<Sort setSortBy={() => {}} setSortDir={() => {}} sortBy="barcode" sortDir="asc" />);
	const myComponent = screen.getByText("Urutkan");
	expect(myComponent).toBeInTheDocument();
});
