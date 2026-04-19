import { AppDetailPage } from "@/features/apps/app/pages/app-detail-page";

type Props = {
  params: Promise<{ appSlug: string }>;
};

export default async function Page({ params }: Props) {
  const { appSlug } = await params;
  return <AppDetailPage appSlug={appSlug} />;
}
