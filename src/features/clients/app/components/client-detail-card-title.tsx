import type { LucideIcon } from "lucide-react";

import { CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";

type ClientDetailCardTitleProps = {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
};

export function ClientDetailCardTitle({ icon: Icon, children, className }: ClientDetailCardTitleProps) {
  return (
    <CardTitle className={cn("flex items-center gap-2 text-base", className)}>
      <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
      {children}
    </CardTitle>
  );
}
