/** Atualiza `data` do nó de etapa no grafo (rascunho) com lista de responsáveis padrão. */
export function setStageNodeDefaultAssignees(
  nextData: Record<string, unknown>,
  userIds: string[],
): void {
  if (userIds.length === 0) {
    delete nextData.defaultAssigneeUserId;
    delete nextData.defaultAssigneeUserIds;
  } else {
    nextData.defaultAssigneeUserIds = userIds;
    nextData.defaultAssigneeUserId = userIds[0];
  }
}
