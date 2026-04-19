import { getApiT } from "@/lib/api/i18n";
import { jsonSuccess } from "@/lib/api-response";
import {
  assertActiveTenantMembership,
  getActiveTenantIdOr400,
  requireSessionOr401,
} from "@/lib/auth/guards";
import { appPrismaRepository } from "@/infrastructure/repositories/app.repository";
import type { ActiveAppDto } from "@/types/api/apps-v1";

export const dynamic = "force-dynamic";

/** Lista apps ativos do tenant (para sidebar). */
export async function GET(request: Request) {
  const apiT = await getApiT(request);
  const auth = await requireSessionOr401(request, apiT);
  if (auth.response) return auth.response;

  const tenantCtx = await getActiveTenantIdOr400(auth.session!, request, apiT);
  if (tenantCtx.response) return tenantCtx.response;

  const memberErr = await assertActiveTenantMembership(auth.session!, tenantCtx.tenantId!, request, apiT);
  if (memberErr) return memberErr;

  const rows = await appPrismaRepository.listActiveTenantApps(tenantCtx.tenantId!);

  const apps: ActiveAppDto[] = rows.map((ta) => ({
    slug: ta.app.slug,
    name: ta.app.name,
    iconUrl: ta.app.iconFile?.r2Key ?? null,
    accentColor: ta.app.accentColor,
    renderMode: ta.app.renderMode,
    internalRoute: ta.app.internalRoute,
  }));

  return jsonSuccess({ apps });
}
