"use client";

import { NewClientWizard } from "@/features/clients/app/components/new-client-wizard";
import { Dialog, StandardDialogContent } from "@/shared/components/ui/dialog";
import { useTranslations } from "next-intl";

type PipelineNewPatientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mountKey: number;
  /** Após criar paciente + jornada (wizard em modo callback). */
  onSuccess: () => void | Promise<void>;
};

export function PipelineNewPatientDialog({
  open,
  onOpenChange,
  mountKey,
  onSuccess,
}: PipelineNewPatientDialogProps) {
  const t = useTranslations("dashboard.pipeline");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <StandardDialogContent
        size="lg"
        title={t("modals.newPatient.title")}
        description={t("modals.newPatient.description")}
        bodyClassName="px-2 py-2"
      >
        <NewClientWizard
          key={mountKey}
          submitBehavior="callback"
          onFlowComplete={async () => {
            onOpenChange(false);
            await onSuccess();
          }}
        />
      </StandardDialogContent>
    </Dialog>
  );
}
