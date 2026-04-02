"use client";

import { ClientDetailCardTitle } from "@/features/clients/app/components/client-detail-card-title";
import {
  useUpdateClient,
} from "@/features/clients/app/hooks/use-update-client";
import { useCreateOpmeSupplier } from "@/features/settings/app/hooks/use-create-opme-supplier";
import { useTenantSettingsPickers } from "@/features/settings/app/hooks/use-tenant-settings-pickers";
import type { ClientDetailClientDto } from "@/types/api/clients-v1";
import { toast } from "@/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { digitsOnlyCpf, formatCpfDisplay } from "@/lib/validators/cpf";
import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Loader2, Plus, Save, UserRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const NONE = "__none__";

type ClientDetailProfileCardProps = {
  clientId: string;
  client: ClientDetailClientDto;
  onSaved: () => void;
};

export function ClientDetailProfileCard({ clientId, client, onSaved }: ClientDetailProfileCardProps) {
  const t = useTranslations("clients.detail.profile");
  const tApi = useTranslations("api");
  const { data: session, status: sessionStatus } = useSession();
  const tenantId = session?.user?.tenantId ?? null;
  const { updateClientById, updating: saving } = useUpdateClient();
  const { creating, submitCreateOpmeSupplier } = useCreateOpmeSupplier();
  const { members, suppliers, appendSupplier } = useTenantSettingsPickers({
    enabled: Boolean(tenantId),
    fallbackErrorMessage: t("saveError"),
  });
  const canCreateOpme =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";

  const [draftEmail, setDraftEmail] = useState(client.email ?? "");
  const [draftDocumentDigits, setDraftDocumentDigits] = useState(() => digitsOnlyCpf(client.documentId ?? ""));
  const [draftAssigned, setDraftAssigned] = useState(client.assignedToUserId ?? NONE);
  const [draftOpme, setDraftOpme] = useState(client.opmeSupplierId ?? NONE);
  const [newOpmeName, setNewOpmeName] = useState("");

  useEffect(() => {
    setDraftEmail(client.email ?? "");
    setDraftDocumentDigits(digitsOnlyCpf(client.documentId ?? ""));
    setDraftAssigned(client.assignedToUserId ?? NONE);
    setDraftOpme(client.opmeSupplierId ?? NONE);
  }, [
    client.id,
    client.updatedAt,
    client.email,
    client.documentId,
    client.assignedToUserId,
    client.opmeSupplierId,
  ]);

  const dirty = useMemo(() => {
    const emailNorm = draftEmail.trim() === "" ? null : draftEmail.trim();
    const serverEmail = client.email;
    const serverDoc = digitsOnlyCpf(client.documentId ?? "");
    const docNorm = draftDocumentDigits.length === 0 ? "" : draftDocumentDigits;
    const a = draftAssigned === NONE ? null : draftAssigned;
    const o = draftOpme === NONE ? null : draftOpme;
    return (
      emailNorm !== serverEmail ||
      docNorm !== serverDoc ||
      a !== client.assignedToUserId ||
      o !== client.opmeSupplierId
    );
  }, [draftEmail, draftDocumentDigits, draftAssigned, draftOpme, client]);

  async function saveProfile() {
    const emailTrim = draftEmail.trim();
    const doc = draftDocumentDigits;
    if (doc.length === 0) {
      toast.error(tApi("errors.validationCpfRequired"));
      return;
    }
    if (doc.length !== 11) {
      toast.error(tApi("errors.validationCpf11Digits"));
      return;
    }
    try {
      await updateClientById(clientId, {
        email: emailTrim === "" ? null : emailTrim,
        documentId: doc,
        assignedToUserId: draftAssigned === NONE ? null : draftAssigned,
        opmeSupplierId: draftOpme === NONE ? null : draftOpme,
      });
      toast.success(t("saved"));
      onSaved();
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  async function handleCreateOpme() {
    const n = newOpmeName.trim();
    if (!n) return;
    try {
      const { supplier } = await submitCreateOpmeSupplier(n);
      setNewOpmeName("");
      appendSupplier({ id: supplier.id, name: supplier.name });
      setDraftOpme(supplier.id);
      toast.success(t("opmeCreated"));
    } catch {
      /* erro: toast global no apiClient */
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <ClientDetailCardTitle icon={UserRound}>{t("title")}</ClientDetailCardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="w-full min-w-0 space-y-4">
        <Field>
          <FieldLabel htmlFor="client-profile-email">{t("email")}</FieldLabel>
          <Input
            id="client-profile-email"
            type="email"
            autoComplete="email"
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            disabled={saving}
            className="w-full min-w-0"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="client-profile-cpf">{t("cpf")}</FieldLabel>
          <FieldDescription>{t("cpfHint")}</FieldDescription>
          <Input
            id="client-profile-cpf"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={formatCpfDisplay(draftDocumentDigits)}
            onChange={(e) => setDraftDocumentDigits(digitsOnlyCpf(e.target.value))}
            disabled={saving}
            className="w-full min-w-0 tabular-nums"
          />
        </Field>
        <Field>
          <FieldLabel>{t("assignedTo")}</FieldLabel>
          <Select
            value={draftAssigned}
            onValueChange={(v) => setDraftAssigned(v ?? NONE)}
            disabled={saving || sessionStatus !== "authenticated" || members === null}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder={t("assignedPlaceholder")}>
                {(value) => {
                  if (value === NONE || value == null) return t("none");
                  const m = members?.find((x) => x.userId === value);
                  return m ? (m.name ?? m.email) : String(value);
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("none")}</SelectItem>
              {(members ?? []).map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.name ?? m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>{t("opme")}</FieldLabel>
          <Select
            value={draftOpme}
            onValueChange={(v) => setDraftOpme(v ?? NONE)}
            disabled={saving || sessionStatus !== "authenticated" || suppliers === null}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder={t("opmePlaceholder")}>
                {(value) => {
                  if (value === NONE || value == null) return t("none");
                  const s = suppliers?.find((x) => x.id === value);
                  return s ? s.name : String(value);
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("none")}</SelectItem>
              {(suppliers ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreateOpme ? (
            <div className="mt-2 flex w-full min-w-0 flex-wrap gap-2">
              <Input
                value={newOpmeName}
                onChange={(e) => setNewOpmeName(e.target.value)}
                placeholder={t("newOpmePlaceholder")}
                disabled={creating}
                className="min-w-[12rem] flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={creating || !newOpmeName.trim()}
                onClick={() => void handleCreateOpme()}
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {t("newOpme")}
              </Button>
            </div>
          ) : null}
        </Field>
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void saveProfile()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? t("saving") : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
