import type { StageAssigneeSummaryDto } from "@/types/api/clients-v1";

export function assigneeDisplayName(user: StageAssigneeSummaryDto): string {
  const name = user.name?.trim();
  return name && name.length > 0 ? name : user.email;
}
