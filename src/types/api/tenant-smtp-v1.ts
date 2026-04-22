export type TenantSmtpDto = {
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  hasPassword: boolean;
  smtpFromName: string | null;
  smtpFromAddress: string | null;
};

export type GetTenantSmtpResponse = { smtp: TenantSmtpDto };

export type PatchTenantSmtpResponse = { smtp: TenantSmtpDto };

export type PostTestTenantSmtpResponse = { ok: true; message: string };
