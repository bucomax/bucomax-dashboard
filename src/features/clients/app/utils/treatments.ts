import type { ClientCompletedTreatmentDto } from "@/types/api/clients-v1";

export function uniqueActors(transitions: ClientCompletedTreatmentDto["transitions"]) {
  const actorById = new Map<string, { name: string | null; email: string }>();

  for (const transition of transitions) {
    const actor = transition.actor;
    if (!actorById.has(actor.id)) {
      actorById.set(actor.id, { name: actor.name, email: actor.email });
    }
  }

  return [...actorById.values()];
}
