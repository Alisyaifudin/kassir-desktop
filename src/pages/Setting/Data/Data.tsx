import Record from "./Download-Record";
import { Product } from "./Download-Product";

export default function Page() {
	return (
		<div className="flex flex-col flex-1 gap-2 text-2xl">
			<section aria-labelledby="download-title" className="flex flex-col gap-2">
				<h2 id="download-title" className="font-bold text-3xl">
					Unduh
				</h2>
				<Product />
				<Record />
			</section>
			<hr />
			<section aria-labelledby="upload-title" className="flex flex-col gap-2">
				<h2 className="font-bold text-3xl" id="upload-title">
					Unggah
				</h2>
				<p>Sedang dikerjakan 😊</p>
			</section>
		</div>
	);
}
