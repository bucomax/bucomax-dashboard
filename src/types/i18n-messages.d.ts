import type account from "../../messages/pt-BR/account.json";
import type auth from "../../messages/pt-BR/auth.json";
import type clients from "../../messages/pt-BR/clients.json";
import type dashboard from "../../messages/pt-BR/dashboard.json";
import type global from "../../messages/pt-BR/global.json";
import type pathways from "../../messages/pt-BR/pathways.json";
import type settings from "../../messages/pt-BR/settings.json";

// Tipos alinhados a `messages/pt-BR/*.json` (paridade com `en/` é manual).

type Messages = {
  global: typeof global;
  auth: typeof auth;
  dashboard: typeof dashboard;
  clients: typeof clients;
  account: typeof account;
  settings: typeof settings;
  pathways: typeof pathways;
};

declare module "next-intl" {
  interface AppConfig {
    Messages: Messages;
  }
}
