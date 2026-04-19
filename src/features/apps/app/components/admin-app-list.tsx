"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminApps, deleteApp, publishApp } from "@/features/apps/app/services/admin-apps.service";
import { AdminAppWizardDialog } from "@/features/apps/app/components/admin-app-wizard-dialog";
import { AppIcon } from "@/features/apps/app/components/app-icon";
import type { AppDto } from "@/types/api/apps-v1";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function AdminAppList() {
  const t = useTranslations("apps.admin");
  const tCat = useTranslations("apps.catalog.categories");
  const [apps, setApps] = useState<AppDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard dialog state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppDto | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getAdminApps();
      setApps(data);
    } catch {
      // apiClient trata toast
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditingApp(null);
    setWizardOpen(true);
  }

  function openEdit(app: AppDto) {
    setEditingApp(app);
    setWizardOpen(true);
  }

  async function handleTogglePublish(app: AppDto) {
    await publishApp(app.id, !app.isPublished);
    void refresh();
  }

  async function handleDelete(app: AppDto) {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await deleteApp(app.id);
      void refresh();
    } catch {
      // apiClient trata toast
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" />
              {t("newApp")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : apps.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noApps")}</p>
          ) : (
            <div className="divide-y">
              {apps.map((app) => (
                <div key={app.id} className="flex items-center gap-4 py-3">
                  <AppIcon iconUrl={app.iconUrl} accentColor={app.accentColor} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{app.name}</span>
                      <Badge variant={app.isPublished ? "default" : "secondary"} className="text-xs">
                        {app.isPublished ? t("published") : t("draft")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {tCat(app.category)}
                      </Badge>
                    </div>
                    {app.tagline && (
                      <p className="text-xs text-muted-foreground truncate">{app.tagline}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title={t("editApp")}
                      onClick={() => openEdit(app)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={app.isPublished ? t("unpublish") : t("publish")}
                      onClick={() => void handleTogglePublish(app)}
                    >
                      {app.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      title={t("deleteApp")}
                      onClick={() => void handleDelete(app)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdminAppWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editApp={editingApp}
        onSaved={() => void refresh()}
      />
    </>
  );
}
