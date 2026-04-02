import type { ReactNode } from "react";

export default function PatientPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-[720px] flex-col overflow-x-auto px-4 py-10">
        {children}
      </div>
    </div>
  );
}
