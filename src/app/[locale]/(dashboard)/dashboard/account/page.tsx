import { redirect } from "@/i18n/navigation";

export default async function Page() {
  redirect({ href: "/dashboard/settings", locale: "inherit" });
}
