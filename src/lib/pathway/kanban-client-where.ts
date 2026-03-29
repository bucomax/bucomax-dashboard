import type { Prisma } from "@prisma/client";

/** Valor de query para filtrar pacientes sem fornecedor OPME atribuído ao cliente. */
export const KANBAN_OPME_QUERY_UNASSIGNED = "__unassigned__";

export function buildClientSearchWhere(search: string): Prisma.ClientWhereInput {
  if (!search) return {};
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ],
  };
}

/**
 * `client` aninhado em `PatientPathwayWhereInput` — busca + filtro opcional por OPME do cliente.
 * `opmeSupplierId` undefined: sem filtro OPME.
 * `KANBAN_OPME_QUERY_UNASSIGNED`: apenas clientes sem `opmeSupplierId`.
 */
export function buildKanbanClientNestedWhere(
  search: string,
  opmeSupplierId?: string,
): Prisma.ClientWhereInput {
  const base: Prisma.ClientWhereInput = {
    deletedAt: null,
    ...buildClientSearchWhere(search),
  };
  if (opmeSupplierId === KANBAN_OPME_QUERY_UNASSIGNED) {
    return { ...base, opmeSupplierId: null };
  }
  if (opmeSupplierId) {
    return { ...base, opmeSupplierId };
  }
  return base;
}
