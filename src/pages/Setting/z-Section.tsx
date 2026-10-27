import { useId, type ReactNode } from "react";

/**
 * A named group on the settings hub: the group's name in a left rail, its panel
 * beside it. `xl` only — below that the name sits above the panel, which is the
 * same information in a single column.
 */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();

  return (
    <section
      aria-labelledby={id}
      className="grid gap-2 xl:grid-cols-[180px_1fr] xl:items-start xl:gap-6"
    >
      <h2 id={id} className="text-base font-semibold xl:pt-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
