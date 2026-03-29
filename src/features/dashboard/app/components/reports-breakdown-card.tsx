"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

type ReportsBreakdownCardProps = {
  title: string;
  description: string;
  rows: Array<{ id: string | null; label: string; count: number }>;
  empty: string;
};

export function ReportsBreakdownCard({
  title,
  description,
  rows,
  empty,
}: ReportsBreakdownCardProps) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">{empty}</div>
        ) : (
          rows.map((row) => {
            const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <div key={`${row.id ?? "null"}-${row.label}`} className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground truncate">{row.label}</span>
                  <span className="font-medium">
                    {row.count} ({pct}%)
                  </span>
                </div>
                <div className="bg-muted h-2 rounded-full">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
