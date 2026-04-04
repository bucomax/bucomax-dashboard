/** TTL (segundos) para `unstable_cache` — listagens; trade-off frescor × DB. */
export const CACHE_REVALIDATE_SEC = {
  /** Listagem de pacientes (sem filtro de status SLA). */
  clientsList: 45,
  /** Jornadas do tenant. */
  pathwaysList: 90,
  /** Fornecedores OPME. */
  opmeSuppliersList: 60,
} as const;
