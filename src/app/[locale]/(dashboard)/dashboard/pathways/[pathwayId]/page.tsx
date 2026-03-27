import { PathwayDetailPage } from "@/features/dashboard/app/pages/pathway-detail-page";

type PageProps = {
  params: Promise<{ pathwayId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { pathwayId } = await params;
  return <PathwayDetailPage pathwayId={pathwayId} />;
}
