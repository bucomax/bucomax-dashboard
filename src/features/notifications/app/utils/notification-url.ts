export function resolveNotificationUrl(type: string, metadata: Record<string, unknown> | null): string | null {
  const clientId = metadata?.clientId;
  if (typeof clientId !== "string" || !clientId) {
    return null;
  }

  if (type === "patient_portal_file_pending" || type === "patient_portal_link_sent") {
    return `/dashboard/clients/${clientId}?tab=files`;
  }

  return `/dashboard/clients/${clientId}`;
}
