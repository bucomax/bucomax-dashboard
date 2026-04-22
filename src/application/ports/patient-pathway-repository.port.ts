export type CreateStageTransitionInput = {
  tenantId: string;
  patientPathwayId: string;
  fromStageId: string | null;
  toStageId: string;
  actorUserId: string;
  note?: string | null;
  forcedByUserId?: string | null;
  ruleOverrideReason?: string | null;
};

export interface IPatientPathwayRepository {
  findById(tenantId: string, patientPathwayId: string): Promise<unknown | null>;
  findActive(tenantId: string, clientId: string): Promise<unknown[]>;
  findCompleted(tenantId: string, clientId: string): Promise<unknown[]>;
  update(
    tenantId: string,
    patientPathwayId: string,
    patch: Record<string, unknown>,
  ): Promise<unknown>;
  createTransition(input: CreateStageTransitionInput): Promise<{ id: string }>;
  findSummaryForChecklist(
    tenantId: string,
    patientPathwayId: string,
  ): Promise<unknown | null>;
  findChecklistItemInPathwayVersion(
    itemId: string,
    pathwayVersionId: string,
  ): Promise<unknown | null>;
  upsertPatientChecklistItemProgress(params: {
    patientPathwayId: string;
    checklistItemId: string;
    completedAt: Date | null;
    completedByUserId: string | null;
  }): Promise<unknown>;
  countChecklistItemsOnStage(pathwayStageId: string): Promise<number>;
  countCompletedChecklistItemsOnStage(
    patientPathwayId: string,
    pathwayStageId: string,
  ): Promise<number>;
  /** Itens com `requiredForTransition: true` na etapa. */
  countRequiredChecklistItemsOnStage(pathwayStageId: string): Promise<number>;
  /** Obrigatórios concluídos (nesta etapa) para o paciente. */
  countCompletedRequiredChecklistItemsOnStage(
    patientPathwayId: string,
    pathwayStageId: string,
  ): Promise<number>;
  findPatientPathwayForChecklistCompleteNotification(
    patientPathwayId: string,
  ): Promise<unknown | null>;

  /** `null` se o `patientPathway` não existir no tenant. */
  listChannelDispatchesForPatientPathway(
    tenantId: string,
    patientPathwayId: string,
  ): Promise<unknown[] | null>;

  /** Detalhe da jornada + checklist da etapa + transições (payload da API). */
  loadPatientPathwayDetailPayload(
    tenantId: string,
    patientPathwayId: string,
  ): Promise<unknown | null>;

  findForCompletion(
    tenantId: string,
    patientPathwayId: string,
  ): Promise<{ id: string; completedAt: Date | null; clientId: string } | null>;

  /** `null` se não existir, já estiver concluída ou falhar o update (ex.: corrida). */
  completePatientPathwayWithSnapshot(
    tenantId: string,
    patientPathwayId: string,
  ): Promise<{
    id: string;
    completedAt: Date;
    client: { id: string; name: string };
    pathway: { id: string; name: string };
    currentStage: { id: string; name: string };
  } | null>;

  runInTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T>;

  findForStageTransition(
    tenantId: string,
    patientPathwayId: string,
  ): Promise<unknown | null>;

  countPatientPathwaysWhere(where: unknown): Promise<number>;

  findManyPatientPathwaysQuery(params: {
    where: unknown;
    skip?: number;
    take?: number;
    orderBy?: unknown;
    include?: unknown;
    select?: unknown;
  }): Promise<unknown[]>;

  findFirstActivePatientPathwayByClientId(clientId: string): Promise<{ id: string } | null>;
}
