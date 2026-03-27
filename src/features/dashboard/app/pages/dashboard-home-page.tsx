import { DashboardPage } from "@/shared/components/layout/dashboard-page";
import type { AppShellUser } from "@/shared/types/layout";
import { getTranslations } from "next-intl/server";
import NextLink from "next/link";

type DashboardHomePageProps = {
  user: AppShellUser;
};

export async function DashboardHomePage({ user }: DashboardHomePageProps) {
  const t = await getTranslations("dashboard.home");

  return (
    <DashboardPage
      title={t("title")}
      description={
        <>
          {t("loggedInAs")}{" "}
          <strong className="text-foreground font-medium">{user.email}</strong> ({user.globalRole}
          {user.tenantId ? (
            <>
              {" "}
              · tenant{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">{user.tenantId}</code>
              {user.tenantRole ? ` (${user.tenantRole})` : ""}
            </>
          ) : null}
          ).
        </>
      }
    >
      <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <p className="text-muted-foreground mb-4 text-sm">{t("shortcuts")}</p>
        <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm">
          <li>
            <NextLink href="/api-doc" className="text-primary underline-offset-4 hover:underline">
              {t("apiDocLink")}
            </NextLink>
          </li>
          <li>
            <code className="bg-muted rounded px-1 py-0.5 text-xs">{t("meEndpoint")}</code> {t("withSession")}
          </li>
        </ul>
      </div>
    </DashboardPage>
  );
}
