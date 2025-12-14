import Record from "./Record";
import { Product } from "./Product";

export default function Page() {
	return (
		<div className="flex flex-col flex-1 gap-2">
			<section aria-labelledby="download-title" className="flex flex-col gap-2">
				<h2 id="download-title" className="font-bold text-big">
					Unduh
				</h2>
				<Product />
				<Record />
			</section>
			<hr />
			<section aria-labelledby="upload-title" className="flex flex-col gap-2">
				<h2 className="font-bold text-big" id="upload-title">
					Unggah
				</h2>
				<p>Sedang dikerjakan 😊</p>
			</section>
		</div>
	);
}
