export interface IPatientSelfRegisterInviteRepository {
  createInvite(params: {
    tenantId: string;
    token: string;
    expiresAt: Date;
    createdByUserId: string;
    clientId: string | null;
  }): Promise<void>;
}
