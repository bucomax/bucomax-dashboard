import { PatientPathwayPage } from "@/features/dashboard/app/pages/patient-pathway-page";

type PageProps = {
  params: Promise<{ patientPathwayId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { patientPathwayId } = await params;
  return <PatientPathwayPage patientPathwayId={patientPathwayId} />;
}
