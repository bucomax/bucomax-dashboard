/** Metadados públicos do convite (definir senha). */
export type InviteSetPasswordPreviewDto = {
  userName: string | null;
  userEmail: string;
  tenantName: string;
  tenantTaxIdDisplay: string | null;
};

/** Corpo interno de `data` em `GET /api/v1/auth/invite-preview`. */
export type InvitePreviewResponseData = {
  preview: InviteSetPasswordPreviewDto | null;
};
