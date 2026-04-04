type FullScreenLoadingProps = {
  message: string;
};

/** Cobre a viewport com fundo sólido, spinner central e mensagem (sessão, troca de token, etc.). */
export function FullScreenLoading({ message }: FullScreenLoadingProps) {
  return (
    <div
      className="bg-background fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{message}</span>
      <div className="relative flex size-[4.5rem] items-center justify-center" aria-hidden>
        <span className="border-primary/20 absolute inset-0 rounded-full border-[3px]" />
        <span className="border-primary absolute inset-0 animate-spin rounded-full border-[3px] border-t-transparent" />
      </div>
      <p className="text-muted-foreground text-center text-base font-medium tracking-tight">{message}</p>
    </div>
  );
}
