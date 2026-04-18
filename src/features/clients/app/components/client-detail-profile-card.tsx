"use client";

import { ClientDetailCardTitle } from "@/features/clients/app/components/client-detail-card-title";
import { useUpdateClient } from "@/features/clients/app/hooks/use-update-client";
import { useCreateOpmeSupplier } from "@/features/settings/app/hooks/use-create-opme-supplier";
import { useTenantSettingsPickers } from "@/features/settings/app/hooks/use-tenant-settings-pickers";
import { patchPatientPortalProfile } from "@/lib/api/patient-portal-client";
import type { PatchPatientPortalProfileBody } from "@/lib/validators/patient-portal-profile";
import type { ClientDetailClientDto, PatchClientRequestBody } from "@/types/api/clients-v1";
import { GuardianRelationship, PatientPreferredChannel } from "@prisma/client";
import { toast } from "@/lib/toast";
import { todayIsoDateLocal } from "@/lib/utils/date";
import { normNullable } from "@/lib/utils/string";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import { digitsOnlyCep, formatCepDisplay } from "@/lib/validators/cep";
import { digitsOnlyCpf, formatCpfDisplay } from "@/lib/validators/cpf";
import { digitsOnlyPhone, formatPhoneBrDisplay, phoneDigitsSchema } from "@/lib/validators/phone";
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
const REL_NONE = "__rel_none__";

type ClientDetailProfileCardProps = {
  clientId: string;
  client: ClientDetailClientDto;
  onSaved: () => void;
  variant?: "staff" | "patient";
  /** Obrigatório quando `variant` é `patient`. */
  tenantSlug?: string;
};

export function ClientDetailProfileCard({
  clientId,
  client,
  onSaved,
  variant = "staff",
  tenantSlug,
}: ClientDetailProfileCardProps) {
  const isPatient = variant === "patient";
  const t = useTranslations("clients.detail.profile");
  const tApi = useTranslations("api");
  const { data: session, status: sessionStatus } = useSession();
  const tenantId = session?.user?.tenantId ?? null;
  const { updateClientById, updating: savingStaff } = useUpdateClient();
  const [savingPatient, setSavingPatient] = useState(false);
  const saving = isPatient ? savingPatient : savingStaff;
  const { creating, submitCreateOpmeSupplier } = useCreateOpmeSupplier();
  const { members, suppliers, appendSupplier } = useTenantSettingsPickers({
    enabled: !isPatient && Boolean(tenantId),
    fallbackErrorMessage: t("saveError"),
  });
  const canCreateOpme =
    session?.user?.tenantRole === "tenant_admin" || session?.user?.globalRole === "super_admin";

  const [draftName, setDraftName] = useState(client.name);
  const [draftPhoneDigits, setDraftPhoneDigits] = useState(() => digitsOnlyPhone(client.phone));
  const [draftEmail, setDraftEmail] = useState(client.email ?? "");
  const [draftDocumentDigits, setDraftDocumentDigits] = useState(() => digitsOnlyCpf(client.documentId ?? ""));
  const [draftAssigned, setDraftAssigned] = useState(client.assignedToUserId ?? NONE);
  const [draftOpme, setDraftOpme] = useState(client.opmeSupplierId ?? NONE);
  const [newOpmeName, setNewOpmeName] = useState("");

  const [draftPostalCode, setDraftPostalCode] = useState(() => digitsOnlyCep(client.postalCode ?? ""));
  const [draftAddressLine, setDraftAddressLine] = useState(client.addressLine ?? "");
  const [draftAddressNumber, setDraftAddressNumber] = useState(client.addressNumber ?? "");
  const [draftAddressComp, setDraftAddressComp] = useState(client.addressComp ?? "");
  const [draftNeighborhood, setDraftNeighborhood] = useState(client.neighborhood ?? "");
  const [draftCity, setDraftCity] = useState(client.city ?? "");
  const [draftState, setDraftState] = useState((client.state ?? "").toUpperCase());

  const [draftIsMinor, setDraftIsMinor] = useState(client.isMinor);
  const [draftGuardianName, setDraftGuardianName] = useState(client.guardianName ?? "");
  const [draftGuardianDocumentDigits, setDraftGuardianDocumentDigits] = useState(() =>
    digitsOnlyCpf(client.guardianDocumentId ?? ""),
  );
  const [draftGuardianPhoneDigits, setDraftGuardianPhoneDigits] = useState(() =>
    digitsOnlyPhone(client.guardianPhone ?? ""),
  );
  const [draftBirthDate, setDraftBirthDate] = useState(client.birthDate ?? "");
  const [draftGuardianEmail, setDraftGuardianEmail] = useState(client.guardianEmail ?? "");
  const [draftGuardianRelationship, setDraftGuardianRelationship] = useState(
    () => client.guardianRelationship ?? REL_NONE,
  );
  const [draftEmergencyName, setDraftEmergencyName] = useState(client.emergencyContactName ?? "");
  const [draftEmergencyPhoneDigits, setDraftEmergencyPhoneDigits] = useState(() =>
    digitsOnlyPhone(client.emergencyContactPhone ?? ""),
  );
  const [draftPreferredChannel, setDraftPreferredChannel] = useState(client.preferredChannel);

  useEffect(() => {
    setDraftName(client.name);
    setDraftPhoneDigits(digitsOnlyPhone(client.phone));
    setDraftEmail(client.email ?? "");
    setDraftDocumentDigits(digitsOnlyCpf(client.documentId ?? ""));
    setDraftAssigned(client.assignedToUserId ?? NONE);
    setDraftOpme(client.opmeSupplierId ?? NONE);
    setDraftPostalCode(digitsOnlyCep(client.postalCode ?? ""));
    setDraftAddressLine(client.addressLine ?? "");
    setDraftAddressNumber(client.addressNumber ?? "");
    setDraftAddressComp(client.addressComp ?? "");
    setDraftNeighborhood(client.neighborhood ?? "");
    setDraftCity(client.city ?? "");
    setDraftState((client.state ?? "").toUpperCase());
    setDraftIsMinor(client.isMinor);
    setDraftGuardianName(client.guardianName ?? "");
    setDraftGuardianDocumentDigits(digitsOnlyCpf(client.guardianDocumentId ?? ""));
    setDraftGuardianPhoneDigits(digitsOnlyPhone(client.guardianPhone ?? ""));
    setDraftBirthDate(client.birthDate ?? "");
    setDraftGuardianEmail(client.guardianEmail ?? "");
    setDraftGuardianRelationship(client.guardianRelationship ?? REL_NONE);
    setDraftEmergencyName(client.emergencyContactName ?? "");
    setDraftEmergencyPhoneDigits(digitsOnlyPhone(client.emergencyContactPhone ?? ""));
    setDraftPreferredChannel(client.preferredChannel);
  }, [
    client.id,
    client.updatedAt,
    client.name,
    client.phone,
    client.email,
    client.documentId,
    client.assignedToUserId,
    client.opmeSupplierId,
    client.postalCode,
    client.addressLine,
    client.addressNumber,
    client.addressComp,
    client.neighborhood,
    client.city,
    client.state,
    client.isMinor,
    client.guardianName,
    client.guardianDocumentId,
    client.guardianPhone,
    client.birthDate,
    client.guardianEmail,
    client.guardianRelationship,
    client.emergencyContactName,
    client.emergencyContactPhone,
    client.preferredChannel,
  ]);

  const dirty = useMemo(() => {
    const emailNorm = draftEmail.trim() === "" ? null : draftEmail.trim();
    const serverEmail = client.email;
    const serverDoc = digitsOnlyCpf(client.documentId ?? "");
    const docNorm = draftDocumentDigits.length === 0 ? "" : draftDocumentDigits;
    const cepNorm = (() => {
      const d = digitsOnlyCep(draftPostalCode);
      return d.length === 8 ? d : "";
    })();
    const serverCep = client.postalCode ?? "";

    const addressDirty =
      cepNorm !== serverCep ||
      normNullable(draftAddressLine) !== normNullable(client.addressLine) ||
      normNullable(draftAddressNumber) !== normNullable(client.addressNumber) ||
      normNullable(draftAddressComp) !== normNullable(client.addressComp) ||
      normNullable(draftNeighborhood) !== normNullable(client.neighborhood) ||
      normNullable(draftCity) !== normNullable(client.city) ||
      normNullable(draftState) !== normNullable(client.state?.toUpperCase() ?? null);

    const guardianDirty =
      draftIsMinor !== client.isMinor ||
      normNullable(draftGuardianName) !== normNullable(client.guardianName) ||
      digitsOnlyCpf(draftGuardianDocumentDigits) !== digitsOnlyCpf(client.guardianDocumentId ?? "") ||
      digitsOnlyPhone(draftGuardianPhoneDigits) !== digitsOnlyPhone(client.guardianPhone ?? "") ||
      draftGuardianEmail.trim() !== (client.guardianEmail ?? "").trim() ||
      (draftGuardianRelationship === REL_NONE ? null : draftGuardianRelationship) !==
        (client.guardianRelationship ?? null);

    const staffProfileExtraDirty =
      !isPatient &&
      (draftBirthDate !== (client.birthDate ?? "") ||
        normNullable(draftEmergencyName) !== normNullable(client.emergencyContactName) ||
        digitsOnlyPhone(draftEmergencyPhoneDigits) !==
          digitsOnlyPhone(client.emergencyContactPhone ?? "") ||
        draftPreferredChannel !== client.preferredChannel);

    if (isPatient) {
      return (
        draftName.trim() !== client.name.trim() ||
        digitsOnlyPhone(draftPhoneDigits) !== digitsOnlyPhone(client.phone) ||
        emailNorm !== serverEmail ||
        docNorm !== serverDoc ||
        addressDirty
      );
    }
    const a = draftAssigned === NONE ? null : draftAssigned;
    const o = draftOpme === NONE ? null : draftOpme;
    return (
      digitsOnlyPhone(draftPhoneDigits) !== digitsOnlyPhone(client.phone) ||
      emailNorm !== serverEmail ||
      docNorm !== serverDoc ||
      a !== client.assignedToUserId ||
      o !== client.opmeSupplierId ||
      addressDirty ||
      guardianDirty ||
      staffProfileExtraDirty
    );
  }, [
    isPatient,
    draftName,
    draftPhoneDigits,
    draftEmail,
    draftDocumentDigits,
    draftAssigned,
    draftOpme,
    draftPostalCode,
    draftAddressLine,
    draftAddressNumber,
    draftAddressComp,
    draftNeighborhood,
    draftCity,
    draftState,
    draftIsMinor,
    draftGuardianName,
    draftGuardianDocumentDigits,
    draftGuardianPhoneDigits,
    draftGuardianEmail,
    draftGuardianRelationship,
    draftBirthDate,
    draftEmergencyName,
    draftEmergencyPhoneDigits,
    draftPreferredChannel,
    client,
  ]);

  async function saveProfile() {
    const phoneDigits = digitsOnlyPhone(draftPhoneDigits);
    const emailTrim = draftEmail.trim();
    const emailNorm = emailTrim === "" ? null : emailTrim;

    // Determina isMinor conforme contexto: patient usa server (readonly), staff usa draft (editável)
    const effectiveIsMinor = isPatient ? client.isMinor : draftIsMinor;

    // Phone: se preenchido, precisa ser válido; se adulto, é obrigatório
    if (phoneDigits.length > 0 && !phoneDigitsSchema.safeParse(phoneDigits).success) {
      toast.error(tApi("errors.validationPhoneBrDigits"));
      return;
    }
    if (!effectiveIsMinor && phoneDigits.length === 0) {
      toast.error(tApi("errors.validationPhoneBrDigits"));
      return;
    }

    // Email: adulto obrigatório
    if (!effectiveIsMinor && !emailNorm) {
      toast.error(tApi("errors.validationEmailRequired"));
      return;
    }

    if (isPatient) {
      const nameTrim = draftName.trim();
      if (!nameTrim) {
        toast.error(t("nameRequired"));
        return;
      }
      if (!tenantSlug?.trim()) {
        toast.error(t("saveError"));
        return;
      }
      const doc = draftDocumentDigits;
      if (!client.isMinor) {
        if (doc.length !== 11) {
          toast.error(doc.length === 0 ? tApi("errors.validationCpfRequired") : tApi("errors.validationCpf11Digits"));
          return;
        }
      } else if (doc.length > 0 && doc.length !== 11) {
        toast.error(tApi("errors.validationCpf11Digits"));
        return;
      }

      const body: PatchPatientPortalProfileBody = {};
      if (nameTrim !== client.name.trim()) body.name = nameTrim;
      if (phoneDigits !== digitsOnlyPhone(client.phone)) body.phone = phoneDigits;
      if (emailNorm !== client.email) body.email = emailTrim === "" ? "" : emailTrim;
      if (digitsOnlyCpf(doc) !== digitsOnlyCpf(client.documentId ?? "")) {
        body.documentId = doc.length === 0 ? "" : doc;
      }

      const pCep = digitsOnlyCep(draftPostalCode);
      const sCep = client.postalCode ?? "";
      const cepVal = pCep.length === 8 ? pCep : null;
      const sCepNorm = sCep.length === 8 ? sCep : null;
      if (cepVal !== sCepNorm) body.postalCode = cepVal;
      if (normNullable(draftAddressLine) !== normNullable(client.addressLine)) {
        body.addressLine = normNullable(draftAddressLine);
      }
      if (normNullable(draftAddressNumber) !== normNullable(client.addressNumber)) {
        body.addressNumber = normNullable(draftAddressNumber);
      }
      if (normNullable(draftAddressComp) !== normNullable(client.addressComp)) {
        body.addressComp = normNullable(draftAddressComp);
      }
      if (normNullable(draftNeighborhood) !== normNullable(client.neighborhood)) {
        body.neighborhood = normNullable(draftNeighborhood);
      }
      if (normNullable(draftCity) !== normNullable(client.city)) body.city = normNullable(draftCity);
      if (normNullable(draftState) !== normNullable(client.state)) {
        body.state = normNullable(draftState)?.toUpperCase() ?? null;
      }

      if (Object.keys(body).length === 0) {
        return;
      }

      setSavingPatient(true);
      try {
        await patchPatientPortalProfile(tenantSlug.trim(), body);
        toast.success(t("saved"));
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("saveError"));
      } finally {
        setSavingPatient(false);
      }
      return;
    }

    const doc = draftDocumentDigits;
    if (draftIsMinor) {
      const gName = draftGuardianName.trim();
      const gDoc = digitsOnlyCpf(draftGuardianDocumentDigits);
      if (!gName) {
        toast.error(tApi("errors.validationGuardianNameRequired"));
        return;
      }
      if (gDoc.length !== 11) {
        toast.error(tApi("errors.validationGuardianCpfRequired"));
        return;
      }
      if (draftGuardianRelationship === REL_NONE) {
        toast.error(tApi("errors.validationGuardianRelationshipRequired"));
        return;
      }
      if (doc.length > 0 && doc.length !== 11) {
        toast.error(tApi("errors.validationCpf11Digits"));
        return;
      }
    } else {
      if (doc.length !== 11) {
        toast.error(doc.length === 0 ? tApi("errors.validationCpfRequired") : tApi("errors.validationCpf11Digits"));
        return;
      }
    }

    const body: PatchClientRequestBody = {};
    if (phoneDigits !== digitsOnlyPhone(client.phone)) body.phone = phoneDigits;
    if (emailNorm !== client.email) body.email = emailNorm;

    const serverDoc = digitsOnlyCpf(client.documentId ?? "");
    if (draftIsMinor) {
      if (doc.length === 0) {
        if (serverDoc.length > 0) body.documentId = null;
      } else if (doc !== serverDoc) {
        body.documentId = doc;
      }
    } else if (doc !== serverDoc) {
      body.documentId = doc;
    }

    if (draftIsMinor !== client.isMinor) body.isMinor = draftIsMinor;

    const gName = draftGuardianName.trim();
    const gDoc = digitsOnlyCpf(draftGuardianDocumentDigits);
    const gPhone = digitsOnlyPhone(draftGuardianPhoneDigits);

    if (draftIsMinor) {
      if (draftIsMinor !== client.isMinor) {
        body.guardianName = gName;
        body.guardianDocumentId = gDoc;
        body.guardianPhone = gPhone.length > 0 ? gPhone : null;
      } else {
        if (gName !== (client.guardianName ?? "").trim()) body.guardianName = gName;
        if (gDoc !== digitsOnlyCpf(client.guardianDocumentId ?? "")) body.guardianDocumentId = gDoc;
        if (gPhone !== digitsOnlyPhone(client.guardianPhone ?? "")) {
          body.guardianPhone = gPhone.length > 0 ? gPhone : null;
        }
      }
      const gEmailTrim = draftGuardianEmail.trim();
      const serverGEmail = (client.guardianEmail ?? "").trim();
      if (gEmailTrim !== serverGEmail) {
        body.guardianEmail = gEmailTrim === "" ? null : gEmailTrim;
      }
      const rel =
        draftGuardianRelationship === REL_NONE
          ? null
          : (draftGuardianRelationship as GuardianRelationship);
      if (rel !== client.guardianRelationship) {
        body.guardianRelationship = rel;
      }
    }

    const birthTrim = draftBirthDate.trim();
    const serverBirth = client.birthDate ?? "";
    if (birthTrim !== serverBirth) {
      body.birthDate = birthTrim === "" ? null : birthTrim;
    }

    const emNameNorm = normNullable(draftEmergencyName);
    const emPhone = digitsOnlyPhone(draftEmergencyPhoneDigits);
    const serverEmName = normNullable(client.emergencyContactName);
    const serverEmPhone = digitsOnlyPhone(client.emergencyContactPhone ?? "");
    if (emNameNorm !== serverEmName) body.emergencyContactName = emNameNorm;
    if (emPhone !== serverEmPhone) {
      body.emergencyContactPhone = emPhone.length > 0 ? emPhone : null;
    }

    if (draftPreferredChannel !== client.preferredChannel) {
      body.preferredChannel = draftPreferredChannel;
    }

    const pCep = digitsOnlyCep(draftPostalCode);
    const cepVal = pCep.length === 8 ? pCep : null;
    const serverCep = client.postalCode ?? "";
    const serverCepNorm = serverCep.length === 8 ? serverCep : null;
    if (cepVal !== serverCepNorm) body.postalCode = cepVal;

    if (normNullable(draftAddressLine) !== normNullable(client.addressLine)) {
      body.addressLine = normNullable(draftAddressLine);
    }
    if (normNullable(draftAddressNumber) !== normNullable(client.addressNumber)) {
      body.addressNumber = normNullable(draftAddressNumber);
    }
    if (normNullable(draftAddressComp) !== normNullable(client.addressComp)) {
      body.addressComp = normNullable(draftAddressComp);
    }
    if (normNullable(draftNeighborhood) !== normNullable(client.neighborhood)) {
      body.neighborhood = normNullable(draftNeighborhood);
    }
    if (normNullable(draftCity) !== normNullable(client.city)) body.city = normNullable(draftCity);
    if (normNullable(draftState) !== normNullable(client.state)) {
      body.state = normNullable(draftState)?.toUpperCase() ?? null;
    }

    const a = draftAssigned === NONE ? null : draftAssigned;
    const o = draftOpme === NONE ? null : draftOpme;
    if (a !== client.assignedToUserId) body.assignedToUserId = a;
    if (o !== client.opmeSupplierId) body.opmeSupplierId = o;

    if (Object.keys(body).length === 0) {
      return;
    }

    try {
      await updateClientById(clientId, body);
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

  const showGuardianReadonly =
    isPatient && (client.guardianName || client.guardianDocumentId || client.guardianPhone);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <ClientDetailCardTitle icon={UserRound}>{isPatient ? t("patientTitle") : t("title")}</ClientDetailCardTitle>
        <CardDescription>{isPatient ? t("patientDescription") : t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="w-full min-w-0 space-y-4">
        {isPatient ? (
          <>
            <Field>
              <FieldLabel htmlFor="client-profile-name">{t("name")}</FieldLabel>
              <Input
                id="client-profile-name"
                autoComplete="name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                disabled={saving}
                className="w-full min-w-0"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="client-profile-phone">
                {client.isMinor ? t("phoneMinor") : t("phone")}
              </FieldLabel>
              <FieldDescription>
                {client.isMinor ? t("phoneMinorHint") : t("phoneHint")}
              </FieldDescription>
              <Input
                id="client-profile-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={formatPhoneBrDisplay(draftPhoneDigits)}
                onChange={(e) => setDraftPhoneDigits(digitsOnlyPhone(e.target.value))}
                disabled={saving}
                className="w-full min-w-0 tabular-nums"
              />
            </Field>
          </>
        ) : null}
        <Field>
          <FieldLabel htmlFor="client-profile-email">
            {(isPatient ? client.isMinor : draftIsMinor) ? t("emailMinor") : t("email")}
          </FieldLabel>
          {(isPatient ? client.isMinor : draftIsMinor) ? (
            <FieldDescription>{t("emailMinorHint")}</FieldDescription>
          ) : null}
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
        {!isPatient ? (
          <Field>
            <FieldLabel htmlFor="client-profile-phone-staff">
              {draftIsMinor ? t("phoneMinor") : t("phone")}
            </FieldLabel>
            <FieldDescription>
              {draftIsMinor ? t("phoneMinorHint") : t("phoneHint")}
            </FieldDescription>
            <Input
              id="client-profile-phone-staff"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={formatPhoneBrDisplay(draftPhoneDigits)}
              onChange={(e) => setDraftPhoneDigits(digitsOnlyPhone(e.target.value))}
              disabled={saving}
              className="w-full min-w-0 tabular-nums"
            />
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="client-profile-cpf">{t("cpf")}</FieldLabel>
          <FieldDescription>
            {client.isMinor ? t("cpfHintMinor") : t("cpfHint")}
          </FieldDescription>
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

        {!isPatient ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="client-birth-date">{t("birthDate")}</FieldLabel>
              <Input
                id="client-birth-date"
                type="date"
                autoComplete="bday"
                max={todayIsoDateLocal()}
                value={draftBirthDate}
                onChange={(e) => {
                  const v = e.target.value;
                  const max = todayIsoDateLocal();
                  setDraftBirthDate(v && v > max ? max : v);
                }}
                disabled={saving}
                className="w-full min-w-0"
              />
            </Field>
            <Field>
              <FieldLabel>{t("preferredChannelField")}</FieldLabel>
              <Select
                value={draftPreferredChannel}
                onValueChange={(v) =>
                  setDraftPreferredChannel((v ?? PatientPreferredChannel.none) as PatientPreferredChannel)
                }
                disabled={saving}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PatientPreferredChannel.none}>
                    {t("preferredChannelOption.none")}
                  </SelectItem>
                  <SelectItem value={PatientPreferredChannel.email}>
                    {t("preferredChannelOption.email")}
                  </SelectItem>
                  <SelectItem value={PatientPreferredChannel.whatsapp}>
                    {t("preferredChannelOption.whatsapp")}
                  </SelectItem>
                  <SelectItem value={PatientPreferredChannel.sms}>
                    {t("preferredChannelOption.sms")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : null}

        {!isPatient ? (
          <label className="border-border flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              checked={draftIsMinor}
              onChange={(e) => {
                const v = e.target.checked;
                setDraftIsMinor(v);
                if (!v) {
                  setDraftGuardianRelationship(REL_NONE);
                }
              }}
              disabled={saving}
              className="mt-0.5 size-4"
            />
            <span>{t("isMinor")}</span>
          </label>
        ) : null}

        {!isPatient && draftIsMinor ? (
          <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">{t("guardianSection")}</p>
            <Field>
              <FieldLabel htmlFor="guardian-name">{t("guardianName")}</FieldLabel>
              <Input
                id="guardian-name"
                value={draftGuardianName}
                onChange={(e) => setDraftGuardianName(e.target.value)}
                disabled={saving}
                className="w-full min-w-0"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="guardian-cpf">{t("guardianDocumentId")}</FieldLabel>
              <Input
                id="guardian-cpf"
                inputMode="numeric"
                value={formatCpfDisplay(draftGuardianDocumentDigits)}
                onChange={(e) => setDraftGuardianDocumentDigits(digitsOnlyCpf(e.target.value))}
                disabled={saving}
                className="w-full min-w-0 tabular-nums"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="guardian-phone">{t("guardianPhone")}</FieldLabel>
              <Input
                id="guardian-phone"
                type="tel"
                inputMode="tel"
                value={formatPhoneBrDisplay(draftGuardianPhoneDigits)}
                onChange={(e) => setDraftGuardianPhoneDigits(digitsOnlyPhone(e.target.value))}
                disabled={saving}
                className="w-full min-w-0 tabular-nums"
              />
            </Field>
            <Field>
              <FieldLabel>{t("guardianRelationshipLabel")}</FieldLabel>
              <Select
                value={draftGuardianRelationship}
                onValueChange={(v) => setDraftGuardianRelationship(v ?? REL_NONE)}
                disabled={saving}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder={t("guardianRelationshipLabel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={REL_NONE}>{t("guardianRelationshipPlaceholder")}</SelectItem>
                  <SelectItem value={GuardianRelationship.mother}>
                    {t("guardianRelationship.mother")}
                  </SelectItem>
                  <SelectItem value={GuardianRelationship.father}>
                    {t("guardianRelationship.father")}
                  </SelectItem>
                  <SelectItem value={GuardianRelationship.legal_guardian}>
                    {t("guardianRelationship.legal_guardian")}
                  </SelectItem>
                  <SelectItem value={GuardianRelationship.other}>
                    {t("guardianRelationship.other")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="guardian-email">{t("guardianEmail")}</FieldLabel>
              <Input
                id="guardian-email"
                type="email"
                autoComplete="email"
                value={draftGuardianEmail}
                onChange={(e) => setDraftGuardianEmail(e.target.value)}
                disabled={saving}
                className="w-full min-w-0"
              />
            </Field>
          </div>
        ) : null}

        {!isPatient ? (
          <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">{t("emergencySection")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="emergency-name">{t("emergencyContactName")}</FieldLabel>
                <Input
                  id="emergency-name"
                  value={draftEmergencyName}
                  onChange={(e) => setDraftEmergencyName(e.target.value)}
                  disabled={saving}
                  className="w-full min-w-0"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="emergency-phone">{t("emergencyContactPhone")}</FieldLabel>
                <Input
                  id="emergency-phone"
                  type="tel"
                  inputMode="tel"
                  value={formatPhoneBrDisplay(draftEmergencyPhoneDigits)}
                  onChange={(e) => setDraftEmergencyPhoneDigits(digitsOnlyPhone(e.target.value))}
                  disabled={saving}
                  className="w-full min-w-0 tabular-nums"
                />
              </Field>
            </div>
          </div>
        ) : null}

        {showGuardianReadonly ? (
          <div className="bg-muted/35 space-y-2 rounded-lg border p-4 text-sm">
            <p className="font-medium">{t("guardianSectionReadonly")}</p>
            <p>
              <span className="text-muted-foreground">{t("guardianName")}: </span>
              {client.guardianName ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">{t("guardianDocumentId")}: </span>
              {client.guardianDocumentId ? formatCpfDisplay(client.guardianDocumentId) : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">{t("guardianPhone")}: </span>
              {client.guardianPhone ? formatPhoneBrDisplay(client.guardianPhone) : "—"}
            </p>
            {client.guardianEmail?.trim() ? (
              <p>
                <span className="text-muted-foreground">{t("guardianEmail")}: </span>
                {client.guardianEmail}
              </p>
            ) : null}
            {client.guardianRelationship ? (
              <p>
                <span className="text-muted-foreground">{t("guardianRelationshipLabel")}: </span>
                {client.guardianRelationship === GuardianRelationship.mother
                  ? t("guardianRelationship.mother")
                  : client.guardianRelationship === GuardianRelationship.father
                    ? t("guardianRelationship.father")
                    : client.guardianRelationship === GuardianRelationship.legal_guardian
                      ? t("guardianRelationship.legal_guardian")
                      : t("guardianRelationship.other")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-sm font-medium">{t("addressSection")}</p>
          <Field>
            <FieldLabel htmlFor="addr-cep">{t("postalCode")}</FieldLabel>
            <FieldDescription>{t("postalCodeHint")}</FieldDescription>
            <Input
              id="addr-cep"
              inputMode="numeric"
              value={formatCepDisplay(draftPostalCode)}
              onChange={(e) => setDraftPostalCode(digitsOnlyCep(e.target.value))}
              disabled={saving}
              className="w-full min-w-0 tabular-nums"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="addr-line">{t("addressLine")}</FieldLabel>
            <Input
              id="addr-line"
              value={draftAddressLine}
              onChange={(e) => setDraftAddressLine(e.target.value)}
              disabled={saving}
              className="w-full min-w-0"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="addr-num">{t("addressNumber")}</FieldLabel>
              <Input
                id="addr-num"
                value={draftAddressNumber}
                onChange={(e) => setDraftAddressNumber(e.target.value)}
                disabled={saving}
                className="w-full min-w-0"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="addr-comp">{t("addressComp")}</FieldLabel>
              <Input
                id="addr-comp"
                value={draftAddressComp}
                onChange={(e) => setDraftAddressComp(e.target.value)}
                disabled={saving}
                className="w-full min-w-0"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="addr-neigh">{t("neighborhood")}</FieldLabel>
            <Input
              id="addr-neigh"
              value={draftNeighborhood}
              onChange={(e) => setDraftNeighborhood(e.target.value)}
              disabled={saving}
              className="w-full min-w-0"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="addr-city">{t("city")}</FieldLabel>
              <Input
                id="addr-city"
                value={draftCity}
                onChange={(e) => setDraftCity(e.target.value)}
                disabled={saving}
                className="w-full min-w-0"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="addr-state">{t("state")}</FieldLabel>
              <Input
                id="addr-state"
                maxLength={2}
                className="w-full min-w-0 uppercase"
                value={draftState}
                onChange={(e) => setDraftState(e.target.value.toUpperCase())}
                disabled={saving}
              />
            </Field>
          </div>
        </div>

        {!isPatient ? (
          <>
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
          </>
        ) : null}
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void saveProfile()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? t("saving") : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
