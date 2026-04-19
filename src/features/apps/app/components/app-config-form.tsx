"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";

import type { AppConfigField } from "@/types/api/apps-v1";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field";

type Props = {
  fields: AppConfigField[];
  onSubmit: (config: Record<string, unknown>) => Promise<void>;
  submitting?: boolean;
};

export function AppConfigForm({ fields, onSubmit, submitting }: Props) {
  const locale = useLocale();
  const t = useTranslations("apps.detail");

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      initial[field.key] = field.default ?? (field.type === "boolean" ? false : "");
    }
    return initial;
  });

  function setValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function getLabel(field: AppConfigField): string {
    return field.label[locale] ?? field.label["pt-BR"] ?? field.label["en"] ?? field.key;
  }

  function getHelpText(field: AppConfigField): string | undefined {
    if (!field.helpText) return undefined;
    return field.helpText[locale] ?? field.helpText["pt-BR"] ?? field.helpText["en"];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(values);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {fields.map((field) => {
        const label = getLabel(field);
        const helpText = getHelpText(field);
        const val = values[field.key];

        switch (field.type) {
          case "boolean":
            return (
              <Field key={field.key}>
                <div className="flex items-center justify-between">
                  <div>
                    <FieldLabel>{label}</FieldLabel>
                    {helpText && <FieldDescription>{helpText}</FieldDescription>}
                  </div>
                  <Switch
                    checked={Boolean(val)}
                    onCheckedChange={(v) => setValue(field.key, v)}
                  />
                </div>
              </Field>
            );

          case "select":
            return (
              <Field key={field.key}>
                <FieldLabel>{label}{field.required && " *"}</FieldLabel>
                {helpText && <FieldDescription>{helpText}</FieldDescription>}
                <Select
                  value={String(val ?? "")}
                  onValueChange={(v) => setValue(field.key, v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={field.placeholder ?? label} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );

          case "textarea":
            return (
              <Field key={field.key}>
                <FieldLabel>{label}{field.required && " *"}</FieldLabel>
                {helpText && <FieldDescription>{helpText}</FieldDescription>}
                <textarea
                  value={String(val ?? "")}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4.5rem] w-full rounded-lg border px-2.5 py-2 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
                  required={field.required}
                />
              </Field>
            );

          default: {
            // text, secret, url, email, number
            const inputType =
              field.type === "secret"
                ? "password"
                : field.type === "number"
                  ? "number"
                  : field.type === "url"
                    ? "url"
                    : field.type === "email"
                      ? "email"
                      : "text";

            return (
              <Field key={field.key}>
                <FieldLabel>{label}{field.required && " *"}</FieldLabel>
                {helpText && <FieldDescription>{helpText}</FieldDescription>}
                <Input
                  type={inputType}
                  value={String(val ?? "")}
                  onChange={(e) =>
                    setValue(
                      field.key,
                      field.type === "number" ? Number(e.target.value) : e.target.value,
                    )
                  }
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </Field>
            );
          }
        }
      })}

      <div className="flex justify-end pt-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          {t("activate")}
        </Button>
      </div>
    </form>
  );
}
