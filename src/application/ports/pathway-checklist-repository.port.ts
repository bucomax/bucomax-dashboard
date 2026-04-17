/**
 * Handle opaco de transação DB (implementação Prisma faz narrowing internamente).
 * Evita acoplar o port a `Prisma.TransactionClient`.
 */
export type DatabaseTransaction = unknown;

export interface IPathwayChecklistRepository {
  listPendingRequiredForTransition(
    tx: DatabaseTransaction,
    patientPathwayId: string,
    currentStageId: string,
  ): Promise<{ id: string; label: string }[]>;
}
