import { Form } from "react-router";
import { Password } from "~/components/Password";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { useAction } from "~/hooks/use-action";
import { useLoading } from "~/hooks/use-loading";
import { Size } from "~/lib/store-old";
import { cn } from "~/lib/utils";
import { Action } from "./action";
import { css } from "./style.css";

export function PasswordForm({ size }: { size: Size }) {
  const loading = useLoading();
  const error = useAction<Action>()("change-password");
  return (
    <Accordion type="single" collapsible className="bg-red-400 text-white">
      <AccordionItem value="item-1">
        <AccordionTrigger className="font-bold px-2">Ganti kata sandi</AccordionTrigger>
        <AccordionContent>
          <Form method="POST" className="flex-col gap-2 flex px-2 ">
            <input type="hidden" name="action" value="change-password"></input>
            <label className={cn("grid gap-2 items-center text-normal", css.password[size])}>
              <span>Kata Sandi Baru</span>
              <Password name="password" aria-autocomplete="list" />
            </label>
            <Button className="w-fit self-end">
              Simpan <Spinner when={loading} />
            </Button>
            <TextError>{error}</TextError>
          </Form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
