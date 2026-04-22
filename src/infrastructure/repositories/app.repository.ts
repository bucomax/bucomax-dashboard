import { prisma } from "@/infrastructure/database/prisma";
import type { AppCategory, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const appWithScreenshots = {
  screenshots: {
    orderBy: { sortOrder: "asc" as const },
    include: { file: true },
  },
  iconFile: true,
} satisfies Prisma.AppInclude;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const appPrismaRepository = {
  // ─── Admin (super_admin) ─────────────────────────────────────────

  async listAll() {
    return prisma.app.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: appWithScreenshots,
    });
  },

  async findById(id: string) {
    return prisma.app.findUnique({
      where: { id },
      include: appWithScreenshots,
    });
  },

  async findBySlug(slug: string) {
    return prisma.app.findUnique({
      where: { slug },
      include: appWithScreenshots,
    });
  },

  /** Busca por ID (cuid) ou slug. */
  async findByIdOrSlug(idOrSlug: string) {
    // CUIDs start with "c" and are 25 chars; slugs are kebab-case
    const isCuid = /^c[a-z0-9]{24}$/.test(idOrSlug);
    if (isCuid) {
      return this.findById(idOrSlug);
    }
    return this.findBySlug(idOrSlug);
  },

  async create(data: {
    name: string;
    slug?: string;
    tagline?: string;
    description?: string;
    category: AppCategory;
    renderMode: Prisma.AppCreateInput["renderMode"];
    accentColor?: string;
    developerName?: string;
    developerUrl?: string;
    iframeBaseUrl?: string;
    internalRoute?: string;
    requiresConfig?: boolean;
    configSchema?: Prisma.InputJsonValue;
    isFeatured?: boolean;
    sortOrder?: number;
    pricingModel?: Prisma.AppCreateInput["pricingModel"];
    priceInCents?: number;
    priceCurrency?: string;
    billingInterval?: Prisma.AppCreateInput["billingInterval"];
    trialDays?: number;
    metadata?: Prisma.InputJsonValue;
  }) {
    const slug = data.slug || slugify(data.name);

    const existing = await prisma.app.findUnique({ where: { slug } });
    if (existing) return { ok: false as const, reason: "SLUG_CONFLICT" as const };

    const app = await prisma.app.create({
      data: {
        name: data.name,
        slug,
        tagline: data.tagline,
        description: data.description,
        category: data.category,
        renderMode: data.renderMode,
        accentColor: data.accentColor,
        developerName: data.developerName,
        developerUrl: data.developerUrl,
        iframeBaseUrl: data.iframeBaseUrl,
        internalRoute: data.internalRoute,
        requiresConfig: data.requiresConfig ?? false,
        configSchema: data.configSchema ?? undefined,
        isFeatured: data.isFeatured ?? false,
        sortOrder: data.sortOrder ?? 0,
        pricingModel: data.pricingModel ?? "free",
        priceInCents: data.priceInCents,
        priceCurrency: data.priceCurrency ?? "BRL",
        billingInterval: data.billingInterval ?? "monthly",
        trialDays: data.trialDays ?? 0,
        metadata: data.metadata ?? undefined,
      },
      include: appWithScreenshots,
    });

    return { ok: true as const, app };
  },

  async update(id: string, data: Prisma.AppUpdateInput) {
    return prisma.app.update({
      where: { id },
      data,
      include: appWithScreenshots,
    });
  },

  async delete(id: string) {
    const hasTenantApps = await prisma.tenantApp.count({ where: { appId: id } });
    if (hasTenantApps > 0) return { ok: false as const, reason: "HAS_ACTIVATIONS" as const };

    await prisma.app.delete({ where: { id } });
    return { ok: true as const };
  },

  async setPublished(id: string, isPublished: boolean) {
    return prisma.app.update({
      where: { id },
      data: { isPublished },
      include: appWithScreenshots,
    });
  },

  // ─── Icon ─────────────────────────────────────────────────────────

  async setIcon(appId: string, fileId: string | null) {
    return prisma.app.update({
      where: { id: appId },
      data: { iconFileId: fileId },
      include: appWithScreenshots,
    });
  },

  // ─── Screenshots ──────────────────────────────────────────────────

  async addScreenshot(appId: string, fileId: string, caption?: Prisma.InputJsonValue) {
    const maxOrder = await prisma.appScreenshot.aggregate({
      where: { appId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return prisma.appScreenshot.create({
      data: { appId, fileId, caption: caption ?? undefined, sortOrder },
      include: { file: true },
    });
  },

  async deleteScreenshot(screenshotId: string) {
    return prisma.appScreenshot.delete({ where: { id: screenshotId } });
  },

  async reorderScreenshots(appId: string, orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.appScreenshot.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  },

  // ─── Tenant catalog ────────────────────────────────────────────────

  async listPublished(filters?: { category?: AppCategory; search?: string; featured?: boolean }) {
    const where: Prisma.AppWhereInput = { isPublished: true };

    if (filters?.category) where.category = filters.category;
    if (filters?.featured) where.isFeatured = true;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { tagline: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.app.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: appWithScreenshots,
    });
  },

  // ─── TenantApp ──────────────────────────────────────────────────────

  async listTenantApps(tenantId: string) {
    return prisma.tenantApp.findMany({
      where: { tenantId },
      include: { app: { include: appWithScreenshots } },
    });
  },

  async listActiveTenantApps(tenantId: string) {
    return prisma.tenantApp.findMany({
      where: { tenantId, status: "active", app: { isPublished: true } },
      include: { app: { include: { iconFile: true } } },
      orderBy: { app: { sortOrder: "asc" } },
    });
  },

  async findTenantApp(tenantId: string, appId: string) {
    return prisma.tenantApp.findUnique({
      where: { tenantId_appId: { tenantId, appId } },
      include: { app: { include: appWithScreenshots } },
    });
  },

  async activateApp(tenantId: string, appId: string, userId: string, config?: Prisma.InputJsonValue) {
    const app = await prisma.app.findUnique({ where: { id: appId } });
    if (!app || !app.isPublished) return { ok: false as const, reason: "APP_NOT_FOUND" as const };

    const status = app.requiresConfig && !config ? "pending_config" : "active";

    const tenantApp = await prisma.tenantApp.upsert({
      where: { tenantId_appId: { tenantId, appId } },
      create: {
        tenantId,
        appId,
        status,
        configEncrypted: config ?? undefined,
        activatedAt: status === "active" ? new Date() : undefined,
        activatedById: userId,
      },
      update: {
        status,
        configEncrypted: config ?? undefined,
        activatedAt: status === "active" ? new Date() : undefined,
        activatedById: userId,
        deactivatedAt: null,
      },
      include: { app: { include: appWithScreenshots } },
    });

    return { ok: true as const, tenantApp };
  },

  async deactivateApp(tenantId: string, appId: string) {
    const existing = await prisma.tenantApp.findUnique({
      where: { tenantId_appId: { tenantId, appId } },
    });
    if (!existing) return { ok: false as const, reason: "NOT_FOUND" as const };

    const tenantApp = await prisma.tenantApp.update({
      where: { tenantId_appId: { tenantId, appId } },
      data: { status: "inactive", deactivatedAt: new Date() },
      include: { app: { include: appWithScreenshots } },
    });

    return { ok: true as const, tenantApp };
  },

  async updateTenantAppConfig(tenantId: string, appId: string, config: Prisma.InputJsonValue) {
    return prisma.tenantApp.update({
      where: { tenantId_appId: { tenantId, appId } },
      data: {
        configEncrypted: config,
        status: "active",
        activatedAt: new Date(),
      },
      include: { app: { include: appWithScreenshots } },
    });
  },
};
