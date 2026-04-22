import { z } from "zod";

const CONSUMER_DOMAINS = new Set(
  [
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "yahoo.com",
    "yahoo.com.br",
    "icloud.com",
    "protonmail.com",
    "proton.me",
    "mail.com",
    "gmx.com",
    "uol.com.br",
    "bol.com.br",
    "terra.com.br",
  ].map((d) => d.toLowerCase()),
);

function isConsumerDomainHost(host: string): boolean {
  const h = host.toLowerCase().trim();
  return CONSUMER_DOMAINS.has(h) || h.endsWith(".gmail.com");
}

const domainNameSchema = z
  .string()
  .min(3)
  .max(253)
  .transform((s) => s.toLowerCase().trim())
  .refine(
    (s) =>
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(s) && !s.includes(".."),
    "Domínio inválido",
  )
  .refine((s) => !isConsumerDomainHost(s), "Use o domínio da clínica; domínios de e-mail público não são permitidos.");

const localPartSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9._+-]+$/i,
    "Use apenas letras, números e . _ + - (prefixo do e-mail)",
  )
  .transform((s) => s.trim().toLowerCase());

export const postSetupTenantEmailDomainBodySchema = z.object({
  domainName: domainNameSchema,
  fromName: z.string().min(1).max(120).transform((s) => s.trim()),
  localPart: localPartSchema,
});

const outboundModeSchema = z.enum(["platform", "smtp", "resend_domain"]);

export const patchTenantEmailDomainBodySchema = z
  .object({
    emailOutboundMode: outboundModeSchema.optional(),
    emailEnabled: z.boolean().optional(),
    fromName: z.string().min(1).max(120).transform((s) => s.trim()).optional(),
    /** Endereço completo (já com domínio verificado do tenant). */
    fromAddress: z.string().email().max(254).transform((s) => s.toLowerCase().trim()).optional(),
  })
  .refine(
    (o) =>
      o.emailOutboundMode !== undefined ||
      o.emailEnabled !== undefined ||
      o.fromName !== undefined ||
      o.fromAddress !== undefined,
    { message: "Informe ao menos um campo" },
  );

export type PostSetupTenantEmailDomainBody = z.infer<typeof postSetupTenantEmailDomainBodySchema>;
export type PatchTenantEmailDomainBody = z.infer<typeof patchTenantEmailDomainBodySchema>;
