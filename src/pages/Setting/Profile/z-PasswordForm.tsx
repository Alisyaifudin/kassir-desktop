import { useState } from "react";
import { toast } from "sonner";
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
import { cn } from "~/lib/utils";

type Props = {
  userId: string;
  onUpdatePassword: (id: string, password: string) => Promise<string | null>;
};

export function PasswordForm({ userId, onUpdatePassword }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [input, setInput] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const err = await onUpdatePassword(userId, input);
    setLoading(false);
    setError(err);
    if (err === null) {
      setInput("");
      toast.success("Berhasil diperbarui");
    }
  }

  return (
    <Accordion type="single" collapsible className="text-white">
      <AccordionItem value="item-1">
        <AccordionTrigger className="font-bold px-2">Ganti kata sandi</AccordionTrigger>
        <AccordionContent>
          <form onSubmit={handleSubmit} className="flex-col gap-2 flex px-2">
            <label
              className={cn(
                "grid gap-2 items-center text-normal",
                "grid-cols-[250px_1fr] small:grid-cols-[160px_1fr]",
              )}
            >
              Kata Sandi Baru
              <Password
                value={input}
                disabled={loading}
                onChange={(e) => setInput(e.currentTarget.value)}
                name="password"
                aria-autocomplete="list"
              />
            </label>
            <Button disabled={loading} className="w-fit self-end">
              Simpan <Spinner when={loading} />
            </Button>
            <TextError>{error}</TextError>
          </form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
