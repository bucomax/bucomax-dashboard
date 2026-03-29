import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Não exibe toast global de erro (ex.: requisição auxiliar ou erro já tratado na UI). */
    skipErrorToast?: boolean;
    /** Mensagem exibida em toast de sucesso após a resposta (opt-in). */
    toastSuccessMessage?: string;
  }
}
