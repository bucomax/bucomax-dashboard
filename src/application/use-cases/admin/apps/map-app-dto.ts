import type { App, AppScreenshot, FileAsset } from "@prisma/client";
import type { AppDto, AppScreenshotDto, AppConfigField } from "@/types/api/apps-v1";

type AppWithRelations = App & {
  iconFile: FileAsset | null;
  screenshots: (AppScreenshot & { file: FileAsset })[];
};

export function mapAppToDto(app: AppWithRelations): AppDto {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    tagline: app.tagline,
    description: app.description,
    iconUrl: app.iconFile?.r2Key ?? null,
    accentColor: app.accentColor,
    developerName: app.developerName,
    developerUrl: app.developerUrl,
    category: app.category,
    renderMode: app.renderMode,
    iframeBaseUrl: app.iframeBaseUrl,
    internalRoute: app.internalRoute,
    requiresConfig: app.requiresConfig,
    configSchema: app.configSchema as AppConfigField[] | null,
    isPublished: app.isPublished,
    isFeatured: app.isFeatured,
    sortOrder: app.sortOrder,
    metadata: app.metadata as Record<string, unknown> | null,
    screenshots: app.screenshots.map(mapScreenshotToDto),
    pricingModel: app.pricingModel,
    priceInCents: app.priceInCents,
    priceCurrency: app.priceCurrency,
    billingInterval: app.billingInterval,
    trialDays: app.trialDays,
  };
}

function mapScreenshotToDto(ss: AppScreenshot & { file: FileAsset }): AppScreenshotDto {
  return {
    id: ss.id,
    imageUrl: ss.file.r2Key,
    caption: ss.caption as Record<string, string> | null,
    sortOrder: ss.sortOrder,
  };
}
