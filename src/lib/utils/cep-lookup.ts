export type CepResult = {
  postalCode: string;
  addressLine: string;
  neighborhood: string;
  city: string;
  state: string;
};

/**
 * Busca endereço via ViaCEP (API pública).
 * Retorna null se CEP inválido, não encontrado, ou API indisponível.
 */
export async function lookupCep(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    if (data.erro) return null;

    return {
      postalCode: digits,
      addressLine: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    return null;
  }
}
