-- AlterEnum: auditoria de configuração de domínio de e-mail
ALTER TYPE "AuditEventType" ADD VALUE 'TENANT_EMAIL_DOMAIN_CONFIGURED';
ALTER TYPE "AuditEventType" ADD VALUE 'TENANT_EMAIL_DOMAIN_REMOVED';
