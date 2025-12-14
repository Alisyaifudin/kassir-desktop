import { Password } from "~/components/Password";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { CashierWithoutPassword } from "~/database/old/cashier";
import { Spinner } from "~/components/Spinner";
import { capitalize } from "~/lib/utils";
import { Form, useActionData, useNavigation } from "react-router";
import { useState } from "react";
import { Action } from "./action";

export function LoginForm({ cashiers }: { cashiers: CashierWithoutPassword[] }) {
  const [selected, handleSelect] = useLogin(cashiers);
  const navigation = useNavigation();
  const error = useAction();
  const loading = navigation.state == "submitting";
  return (
    <div className="flex flex-col gap-5 p-5 bg-white mx-auto w-full max-w-5xl ">
      <h1 className="text-big font-bold">Masuk</h1>
      <Form method="POST" className="flex text-normal flex-col gap-2">
        <input type="hidden" name="action" value="login"></input>
        <label className="grid items-center grid-cols-[150px_1fr]">
          <span>Nama</span>
          <select
            value={selected?.name ?? ""}
            onChange={handleSelect}
            name="name"
            className="outline rounded-lg p-2"
          >
            <option value="">--PILIH AKUN--</option>
            {cashiers.map((c) => (
              <option key={c.name} value={c.name}>
                {capitalize(c.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid items-center grid-cols-[150px_1fr]">
          <span>Kata Sandi</span>
          <Password name="password" />
        </label>
        <TextError>{error}</TextError>
        <Button className="w-fit self-end " disabled={loading || selected === null}>
          Masuk
          <Spinner when={loading} />
        </Button>
      </Form>
    </div>
  );
}

function useLogin(cashiers: CashierWithoutPassword[]) {
  const [selected, setSelected] = useState<{ name: string; role: "admin" | "user" } | null>(null);
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const user = cashiers.find((c) => c.name === e.currentTarget.value);
    if (!user) {
      setSelected(null);
      return;
    }
    setSelected(user);
  };
  return [selected, handleSelect] as const;
}

function useAction() {
  const action = useActionData<Action>();
  if (action === undefined || action.action !== "login") return undefined;
  return action.error;
}
