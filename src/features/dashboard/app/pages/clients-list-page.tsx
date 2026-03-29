import { ClientsList } from "@/features/clients/app/components/clients-list";
import { PatientSelfRegisterQrDialog } from "@/features/clients/app/components/patient-self-register-qr-dialog";
import { Link } from "@/i18n/navigation";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { Button } from "@/shared/components/ui/button";
import { UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function ClientsListPage() {
  const t = await getTranslations("clients.list");

  return (
    <DashboardPage
      title={t("title")}
      description={t("description")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PatientSelfRegisterQrDialog />
          <Button nativeButton={false} size="sm" render={<Link href="/dashboard/clients/new" />}>
            <UserPlus className="size-4" />
            {t("newPatient")}
          </Button>
        </div>
      }
    >
      <ClientsList />
    </DashboardPage>
  );
}
