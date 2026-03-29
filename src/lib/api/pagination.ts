/** Metadados de paginação em respostas `GET` paginadas (lista no campo `data`). */
export type ApiPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export function buildPagination(page: number, limit: number, totalItems: number): ApiPagination {
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safeLimit);

  return {
    page: safePage,
    limit: safeLimit,
    totalItems,
    totalPages,
    hasNextPage: totalPages > 0 && safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
}
