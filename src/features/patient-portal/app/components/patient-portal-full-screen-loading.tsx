import { FullScreenLoading } from "@/shared/components/feedback/full-screen-loading";

type PatientPortalFullScreenLoadingProps = {
  message: string;
};

/** Portal do paciente — mesmo visual que `FullScreenLoading` (ex.: troca de token na rota /enter). */
export function PatientPortalFullScreenLoading({ message }: PatientPortalFullScreenLoadingProps) {
  return <FullScreenLoading message={message} />;
}
