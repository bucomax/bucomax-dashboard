import { cn } from "@/lib/utils";

type FullScreenLoadingProps = {
  message: string;
  /** Quando `false`, só o indicador visual; `message` continua acessível em `sr-only`. */
  showMessage?: boolean;
};

/** Cobre a viewport com fundo sólido, spinner central e mensagem (sessão, troca de token, etc.). */
export function FullScreenLoading({ message, showMessage = true }: FullScreenLoadingProps) {
  const trimmed = message.trim();
  const ariaLabel = trimmed.length > 0 ? trimmed : "Loading";

  return (
    <div
      className={cn(
        "bg-background fixed inset-0 z-50 flex flex-col items-center justify-center px-4",
        showMessage && trimmed.length > 0 ? "gap-6" : "gap-0",
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{ariaLabel}</span>
      <div className="relative flex size-[4.5rem] items-center justify-center" aria-hidden>
        <span className="border-primary/20 absolute inset-0 rounded-full border-[3px]" />
        <span className="border-primary absolute inset-0 animate-spin rounded-full border-[3px] border-t-transparent" />
      </div>
      {showMessage && trimmed.length > 0 ? (
        <p className="text-muted-foreground text-center text-base font-medium tracking-tight">{trimmed}</p>
      ) : null}
    </div>
  );
}
