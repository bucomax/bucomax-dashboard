export type PatientPortalLinkTokenMagicLinkRow = {
  id: string;
  clientId: string;
  expiresAt: Date;
  singleUse: boolean;
  usedAt: Date | null;
  client: {
    id: string;
    tenantId: string;
    deletedAt: Date | null;
    portalPasswordChangedAt: Date | null;
  };
};

export interface IPatientPortalLinkTokenRepository {
  findByTokenForMagicLinkExchange(token: string): Promise<PatientPortalLinkTokenMagicLinkRow | null>;

  markSingleUseConsumed(id: string, usedAt: Date): Promise<void>;

  createPortalLinkToken(params: {
    clientId: string;
    token: string;
    expiresAt: Date;
    singleUse: boolean;
  }): Promise<{ id: string }>;
}
