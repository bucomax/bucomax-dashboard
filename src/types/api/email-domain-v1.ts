/** Registro DNS retornado pelo Resend (exibido na UI de verificação). */
export type EmailDomainDnsRow = {
  type: string;
  name: string;
  value: string;
  status?: string;
  ttl?: string;
  priority?: number;
  record?: string;
};

export type EmailOutboundModeDto = "platform" | "smtp" | "resend_domain";

/**
 * DTO público (sem `emailResendDomainId` — permanece no servidor).
 */
export type TenantEmailDomainDto = {
  /** Qual configuração de envio está ativa (o usuário escolhe na UI). */
  outboundMode: EmailOutboundModeDto;
  emailEnabled: boolean;
  fromName: string | null;
  fromAddress: string | null;
  domainName: string | null;
  status: "none" | "pending" | "verified" | "failed" | "not_started" | "temporary_failure";
  dnsRecords: EmailDomainDnsRow[] | null;
  verifiedAt: string | null;
};

export type GetTenantEmailDomainResponseData = {
  emailDomain: TenantEmailDomainDto;
};

export type PostSetupTenantEmailDomainRequestBody = {
  domainName: string;
  fromName: string;
  localPart: string;
};

export type PostSetupTenantEmailDomainResponseData = {
  emailDomain: TenantEmailDomainDto;
};

export type PostVerifyTenantEmailDomainResponseData = {
  emailDomain: TenantEmailDomainDto;
};

export type PatchTenantEmailDomainRequestBody = {
  emailOutboundMode?: EmailOutboundModeDto;
  emailEnabled?: boolean;
  fromName?: string;
  fromAddress?: string;
};

export type PatchTenantEmailDomainResponseData = {
  emailDomain: TenantEmailDomainDto;
};
