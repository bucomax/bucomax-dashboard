export interface IPatientPortalOtpRepository {
  countRecentChallenges(clientId: string, since: Date): Promise<number>;

  createChallenge(params: {
    clientId: string;
    tenantId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<void>;

  findLatestActiveChallenge(
    clientId: string,
    tenantId: string,
  ): Promise<{ id: string; codeHash: string; attempts: number } | null>;

  incrementChallengeAttempts(id: string): Promise<void>;

  markChallengeConsumed(id: string): Promise<void>;
}
