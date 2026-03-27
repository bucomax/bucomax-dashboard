/**
 * Toasts globais (Sonner). Use apenas em Client Components ou em callbacks que rodam no browser.
 *
 * @example
 * import { toast } from "@/lib/toast";
 * toast.success("Salvo com sucesso.");
 * toast.error("Não foi possível concluir.");
 * toast.warning("Atenção: revise os dados.");
 */
export { toast, type ExternalToast } from "sonner";
