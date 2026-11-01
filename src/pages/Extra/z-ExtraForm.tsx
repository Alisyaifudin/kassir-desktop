import { createFormHook } from "@tanstack/react-form";
import { Fragment } from "react/jsx-runtime";
import { fieldContext, formContext, type Kind } from "./util-extra-options";
import { CheckDual } from "./z-CheckDual";
import { KindField } from "./z-KindField";
import { ShortField } from "./z-ShortField";
import { ValueField } from "./z-ValueField";

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    ShortField,
    ValueField,
    KindField,
    CheckDual,
  },
  formComponents: {},
});

/**
 * The extra's fields, shared by the create page and the detail pane. The amount
 * is one field whichever kind is chosen: `ValueField` takes the kind as a prop
 * and renders the rupiah field or the percent field, so the two can never drift
 * apart or hold the same number under different units.
 *
 * The actions (`Simpan`, `Batal`/`Hapus`) are the caller's `children`: the page
 * that owns the route is the one that knows where "back" and "delete" go.
 */
export const ExtraForm = withForm({
  defaultValues: {
    name: "",
    kind: "percent" as Kind,
    value: 0,
    dual: false,
  },
  props: {
    children: <Fragment></Fragment>,
  },
  render: function Render({ form, children }) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex w-full flex-col gap-4"
      >
        <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-2">
            <h2 className="text-sm font-semibold">Detail biaya</h2>
          </div>
          <div className="flex flex-col gap-4 p-4">
            <form.AppField name="name">
              {(field) => (
                <field.ShortField placeholder="Ongkir, Biaya kemasan, …">Nama</field.ShortField>
              )}
            </form.AppField>
            <form.AppField name="kind">{(field) => <field.KindField />}</form.AppField>
            {/* The amount follows the kind; subscribing here keeps that one row
                re-rendering instead of the whole field set. */}
            <form.Subscribe selector={(state) => state.values.kind}>
              {(kind) => (
                <form.AppField name="value">
                  {(field) => <field.ValueField kind={kind}>Nilai Awal</field.ValueField>}
                </form.AppField>
              )}
            </form.Subscribe>
            <form.AppField name="dual">{(field) => <field.CheckDual />}</form.AppField>
          </div>
        </section>
        {children}
      </form>
    );
  },
});
