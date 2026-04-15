"use client";

import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Wifi,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useWhatsAppSettings } from "@/features/settings/app/hooks/use-whatsapp-settings";
import { toast } from "@/lib/toast";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/shared/components/ui/field";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";

const WEBHOOK_PATH = "/api/v1/webhooks/whatsapp";

export function WhatsAppSettingsCard() {
  const t = useTranslations("settings.whatsapp");
  const {
    settings,
    hasLoaded,
    loading,
    saving,
    testing,
    canEdit,
    save,
    testConnection,
  } = useWhatsAppSettings();

  const [enabled, setEnabled] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (!hasLoaded) return;
    setEnabled(settings.whatsappEnabled);
    setPhoneNumberId(settings.whatsappPhoneNumberId ?? "");
    setBusinessAccountId(settings.whatsappBusinessAccountId ?? "");
    setAccessToken("");
    setVerifyToken(settings.whatsappWebhookVerifyToken ?? "");
  }, [hasLoaded, settings]);

  if (loading && !hasLoaded) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${WEBHOOK_PATH}`
      : WEBHOOK_PATH;

  async function handleSave() {
    await save({
      whatsappEnabled: enabled,
      whatsappPhoneNumberId: phoneNumberId || null,
      whatsappBusinessAccountId: businessAccountId || null,
      ...(accessToken ? { whatsappAccessToken: accessToken } : {}),
      whatsappWebhookVerifyToken: verifyToken || null,
    });
  }

  async function handleTestConnection() {
    try {
      const result = await testConnection();
      if (result.ok) {
        toast.success(t("testSuccess"));
      }
    } catch {
      // apiClient already shows error toast
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  }

  const isVerified = Boolean(settings.whatsappVerifiedAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {hasLoaded && enabled && (
            <Badge variant={isVerified ? "default" : "secondary"} className="gap-1">
              {isVerified ? (
                <>
                  <CheckCircle2 className="size-3" />
                  {t("statusConnected")}
                </>
              ) : (
                <>
                  <XCircle className="size-3" />
                  {t("statusNotConnected")}
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enable toggle */}
        <Field>
          <div className="flex items-center justify-between">
            <div>
              <FieldLabel>{t("enableLabel")}</FieldLabel>
              <FieldDescription>{t("enableDescription")}</FieldDescription>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!canEdit}
            />
          </div>
        </Field>

        {enabled ? (
          <>
            {/* Credentials */}
            <Field>
              <FieldLabel>{t("phoneNumberId")}</FieldLabel>
              <FieldDescription>{t("phoneNumberIdHint")}</FieldDescription>
              <FieldContent>
                <Input
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="123456789012345"
                  disabled={!canEdit}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("businessAccountId")}</FieldLabel>
              <FieldDescription>{t("businessAccountIdHint")}</FieldDescription>
              <FieldContent>
                <Input
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  placeholder="123456789012345"
                  disabled={!canEdit}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("accessToken")}</FieldLabel>
              <FieldDescription>
                {settings.hasAccessToken ? t("accessTokenSaved") : t("accessTokenHint")}
              </FieldDescription>
              <FieldContent>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={settings.hasAccessToken ? "********" : t("accessTokenPlaceholder")}
                    disabled={!canEdit}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("webhookVerifyToken")}</FieldLabel>
              <FieldDescription>{t("webhookVerifyTokenHint")}</FieldDescription>
              <FieldContent>
                <Input
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  disabled={!canEdit}
                />
              </FieldContent>
            </Field>

            {/* Webhook URL (read-only, copyable) */}
            <Field>
              <FieldLabel>{t("webhookUrl")}</FieldLabel>
              <FieldDescription>{t("webhookUrlHint")}</FieldDescription>
              <FieldContent>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="bg-muted font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </FieldContent>
            </Field>
          </>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-6">
        <div className="flex gap-2">
          {enabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || !settings.hasAccessToken || !settings.whatsappPhoneNumberId}
            >
              {testing ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Wifi className="mr-1.5 size-3.5" />
              )}
              {t("testConnection")}
            </Button>
          ) : null}
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || !canEdit}>
          {saving ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-3.5" />
          )}
          {t("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
