import { PatientPathwayPanel } from "@/features/pathways/app/components/patient-pathway-panel";
import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import { getTranslations } from "next-intl/server";

type PatientPathwayPageProps = {
  patientPathwayId: string;
};

export async function PatientPathwayPage({ patientPathwayId }: PatientPathwayPageProps) {
  const t = await getTranslations("pathways.patient");

  return (
    <DashboardPage title={t("title")} description={t("description")}>
      <PatientPathwayPanel patientPathwayId={patientPathwayId} />
    </DashboardPage>
  );
}
