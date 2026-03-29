import { ClientDetailPage } from "@/features/clients/app/pages/client-detail-page";

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  return <ClientDetailPage clientId={clientId} />;
}
