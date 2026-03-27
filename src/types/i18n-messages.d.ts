import type auth from "../../messages/pt-BR/auth.json";
import type clients from "../../messages/pt-BR/clients.json";
import type dashboard from "../../messages/pt-BR/dashboard.json";
import type global from "../../messages/pt-BR/global.json";

// Tipos alinhados a `messages/pt-BR/*.json` (paridade com `en/` é manual).

type Messages = {
  global: typeof global;
  auth: typeof auth;
  dashboard: typeof dashboard;
  clients: typeof clients;
};

declare module "next-intl" {
  interface AppConfig {
    Messages: Messages;
  }
}
