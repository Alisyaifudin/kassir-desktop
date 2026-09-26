import { createFormHook } from "@tanstack/react-form";
import { Fragment } from "react/jsx-runtime";
import { fieldContext, formContext } from "./util-extra-options";
import { ShortField } from "./z-ShortField";
import { SelectKind } from "./z-SelectKind";
import { CheckDual } from "./z-CheckDual";

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    ShortField,
    SelectKind,
    CheckDual,
  },
  formComponents: {},
});

export const ExtraForm = withForm({
  defaultValues: {
    name: "",
    value: "",
    kind: "percent" as DB.ValueKind,
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
        className="flex flex-col py-1 gap-2 text-normal mx-auto w-full max-w-4xl"
      >
        <form.AppField name="name">
          {(field) => <field.ShortField type="text">Nama</field.ShortField>}
        </form.AppField>
        <form.AppField name="value">
          {(field) => <field.ShortField type="number">Nilai Awal</field.ShortField>}
        </form.AppField>
        <form.AppField name="kind">{(field) => <field.SelectKind />}</form.AppField>
        <form.AppField name="dual">{(field) => <field.CheckDual />}</form.AppField>
        {children}
      </form>
    );
  },
});
