"use client";

import { useAppCatalog } from "@/features/apps/app/hooks/use-app-catalog";
import { AppCatalogCard } from "./app-catalog-card";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useDebouncedState } from "@/shared/hooks/use-debounce";
import type { AppCategory, AppCatalogCardDto } from "@/types/api/apps-v1";

const CATEGORIES: AppCategory[] = [
  "communication",
  "ai",
  "scheduling",
  "clinical",
  "financial",
  "integration",
];

export function AppCatalogGrid() {
  const t = useTranslations("apps");
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | undefined>();
  const [searchInput, debouncedSearch, setSearchInput] = useDebouncedState("", { delayMs: 400, trim: true });

  const { data, loading } = useAppCatalog({
    category: selectedCategory,
    search: debouncedSearch || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("catalog.searchPlaceholder")}
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory(undefined)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !selectedCategory
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("catalog.filterAll")}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat === selectedCategory ? undefined : cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t(`catalog.categories.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Featured */}
      {data?.featured && data.featured.length > 0 && !selectedCategory && !debouncedSearch && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("catalog.featured")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.featured.map((app) => (
              <AppCatalogCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      )}

      {/* Por categoria */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : data?.byCategory ? (
        <div className="space-y-8">
          {(Object.entries(data.byCategory) as [AppCategory, AppCatalogCardDto[]][]).map(
            ([category, apps]) => (
              <section key={category}>
                <h2 className="mb-3 text-lg font-semibold">
                  {t(`catalog.categories.${category}`)}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {apps.map((app) => (
                    <AppCatalogCard key={app.id} app={app} />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          {debouncedSearch ? t("catalog.emptySearch", { search: debouncedSearch }) : t("catalog.empty")}
        </p>
      )}
    </div>
  );
}
