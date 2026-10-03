import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useExtraSearch } from "~/hooks/use-extra-search";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { generateId } from "~/lib/random";
import { Extra } from "~/database/extra/cache";
import { tx } from "~/transaction";
import { useAtom } from "@xstate/store/react";
import { FuzzyResult } from "@nozbe/microfuzz";
import { basicStore } from "../../../use-transaction";
import { useSubtotal } from "../../../store/product";
import { extrasStore } from "../../../store/extra";
import { useTab } from "../../../use-tab";
import { queue } from "../../../util-queue";

function setQuery(query: string) {
  basicStore.set((prev) => ({ ...prev, query }));
}

function useQuery() {
  const value = useAtom(basicStore, (state) => state.query);
  return value;
}

export function useSearch(allExtras: Extra[]) {
  const ref = useRef<HTMLInputElement>(null);
  const [tab] = useTab();
  const query = useQuery();
  const [extras, setExtras] = useState<FuzzyResult<Extra>[]>([]);
  const subtotal = useSubtotal();
  const searchExtra = useExtraSearch(allExtras);
  const debounced = useDebouncedCallback((value: string) => {
    if (value.trim() === "") {
      setExtras([]);
    } else {
      setExtras(searchExtra(value.trim()));
    }
    queue.add(tx.transaction.update.query(tab, value));
  }, DEBOUNCE_DELAY);
  const [error, setError] = useState("");
  useEffect(() => {
    debounced(query);
  }, [query, debounced]);

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const val = e.currentTarget.value.replace(/\t/g, "").trimStart();
    setQuery(val);
    setError("");
  };

  const handleClickExtra = (extra: Extra) => {
    if (ref.current === null) return;
    setExtras([]);
    setQuery("");
    setError("");
    queue.add(tx.transaction.update.query(tab, ""));
    ref.current.focus();
    const id = generateId();
    extrasStore.trigger.add({
      extra: {
        id,
        kind: extra.kind,
        name: extra.name,
        tab,
        value: extra.value,
        extraId: extra.id,
      },
      subtotal,
    });
    queue.add(
      tx.extra.add.one({
        tab,
        id,
        name: extra.name,
        value: extra.value,
        kind: extra.kind,
      }),
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (error !== "" || query.trim() === "") {
      return;
    }
    const extraMatch = allExtras.find((p) => p.name.toLowerCase() === query.toLowerCase().trim());
    if (extraMatch !== undefined) {
      handleClickExtra(extraMatch);
      return;
    }
    const extra = extras.at(0);
    if (extra !== undefined) {
      handleClickExtra(extra.item);
      return;
    }
    setError("Biaya tambahan tidak ditemukan");
  };

  return {
    query,
    extras,
    handleChange: handleChangeInput,
    handleClickExtra,
    handleSubmit,
    error,
    ref,
  };
}
