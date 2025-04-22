import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Item, ItemComponent } from "./Item";

export function ListItem({}: { items: Item[] }) {
	return (
		<div className="border-r flex-1 flex flex-col gap-2">
			<div className="outline h-full flex-1 p-1 flex flex-col gap-1 overflow-y-auto">
				<h1 className="text-2xl font-bold">Barang</h1>
				<div className="grid grid-cols-[50px_1fr_100px_180px_50px_100px_40px] gap-1 outline">
					<p className="border-r">No.</p>
					<p className="border-r">Nama</p>
					<p className="border-r">Harga</p>
					<p className="border-r">Diskon</p>
					<p className="border-r">Qty</p>
					<p>Subtotal</p>
					<div />
				</div>
				<div className="flex flex-col overflow-y-auto">
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={1}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={2}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={3}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={4}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={1}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={2}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={3}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={4}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={1}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={2}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={3}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={4}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={1}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={2}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={3}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={4}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={1}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={2}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={3}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={4}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={1}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={2}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={3}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={4}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={1}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={2}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={1}
						name="uwu"
						price="100"
						qty={10}
					/>
					<ItemComponent
						disc={{ value: 0, type: "number" }}
						no={2}
						name="uwu"
						price="100"
						qty={10}
					/>
				</div>
			</div>
			<div className="flex items-center pr-1 h-[150px]">
				<div className="flex gap-2 text-7xl flex-1">
					<p className="font-bold">Total:</p>
					<p>Rp100.000</p>
				</div>
				<div className="flex-1 flex flex-col gap-1 h-full">
					<label className="grid grid-cols-[90px_1fr] items-center">
						<span>Bayar:</span>
						<Input type="number" />
					</label>
					<label className="grid grid-cols-[90px_1fr] items-center">
						<span>Diskon:</span>
						<Input type="number" defaultValue={0} />
					</label>
					<div className="grid grid-cols-[103px_1fr] h-[30px] items-center">
						<p>Kembalian:</p>
						<p>5.000</p>
					</div>
					<Button>Bayar</Button>
				</div>
			</div>
			<div></div>
		</div>
	);
}
