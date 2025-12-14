import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { DeleteBtn } from "./DeleteBtn";
import { Barcode } from "./Barcode";
import { Field } from "./Field";
import { Spinner } from "~/components/Spinner";
import { Form } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";
import { Size } from "~/lib/store-old";
import { cn } from "~/lib/utils";
import { css } from "./style.css";

export function ProductForm({ product, size }: { product: DB.Product; size: Size }) {
  const loading = useLoading();
  const error = useAction<Action>()("edit");
  return (
    <Form method="POST" className="flex flex-col gap-2 w-full h-full overflow-auto px-0.5">
      <input type="hidden" name="action" value="edit"></input>
      <h1 className="font-bold text-3xl">Edit barang</h1>
      <Field size={size} error={error?.name ?? ""} label="Nama*">
        <Input
          type="text"
          className="outline"
          name="name"
          required
          defaultValue={product.name}
          aria-autocomplete="list"
        />
      </Field>
      <Field size={size} error={error?.price ?? ""} label="Harga*">
        <Input
          type="number"
          className="outline w-[300px]"
          name="price"
          required
          defaultValue={product.price}
          step={0.00001}
          aria-autocomplete="list"
        />
      </Field>
      <Field size={size} error={error?.capital ?? ""} label="Modal">
        <Input
          type="number"
          className="outline w-[300px]"
          name="capital"
          aria-autocomplete="list"
          step={0.00001}
          defaultValue={product.capital}
        />
      </Field>
      <Field size={size} error={error?.stock ?? ""} label="Stok*">
        <Input
          type="number"
          className="outline w-[100px]"
          name="stock"
          required
          aria-autocomplete="list"
          defaultValue={product.stock}
        />
      </Field>
      <Field size={size} error={error?.stockBack ?? ""} label="Gudang">
        <Input
          type="number"
          className="outline w-[100px]"
          name="stock-back"
          aria-autocomplete="list"
          defaultValue={product.stock_back}
        />
      </Field>
      <Barcode size={size} barcode={product.barcode} />
      <label className="flex flex-col">
        <div className={cn("grid gap-2 items-center", css.grid[size])}>
          <span className="text-normal">Catatan</span>
          <Textarea rows={3} name="note" defaultValue={product.note} />
        </div>
        {error?.note === "" ? null : (
          <div className={cn("grid gap-2", css.grid[size])}>
            <div></div>
            <TextError>{error?.note ?? ""}</TextError>
          </div>
        )}
      </label>
      <div className="flex items-center justify-between">
        <Button className="w-fit" type="submit">
          Simpan
          <Spinner when={loading} />
        </Button>
        <DeleteBtn name={product.name} />
      </div>
      <TextError>{error?.global}</TextError>
    </Form>
  );
}
