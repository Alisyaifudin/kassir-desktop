import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useEffect, useState } from "react";
import { TextError } from "~/components/TextError";
import { Form } from "react-router";
import { SelectType } from "./z-SelectType";
import { NumberField } from "~/components/NumberField";
import { Spinner } from "~/components/Spinner";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { Textarea } from "~/components/ui/textarea";

export const NewItem = memo(function ({ kind }: { kind: "saving" | "debt" | "diff" }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"change" | "absolute">(kind === "debt" ? "change" : "absolute");
  const loading = useLoading();
  const error = useAction<Action>()("new");
  useEffect(() => {
    if (error === undefined && !loading) {
      setOpen(false);
    }
  }, [loading, error]);
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>Catatan Baru</DialogTrigger>
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Catatan Keuangan</DialogTitle>
          <Form method="POST" className="flex flex-col gap-2">
            <input type="hidden" name="action" value="new"></input>
            <input type="hidden" name="type" value={type}></input>
            <input type="hidden" name="kind" value={kind}></input>
            <div className="flex items-center gap-2">
              <NumberField name="value" placeholder="Nilai" aria-autocomplete="list" />
              {kind === "diff" ? null : <SelectType type={type} onChange={setType} />}
            </div>
            <TextError>{error}</TextError>
            <Textarea rows={3} name="note" placeholder="Catatan"/>
            <div className="col-span-2 flex flex-col items-end">
              <Button>
                Tambah
                <Spinner when={loading} />
              </Button>
            </div>
          </Form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
