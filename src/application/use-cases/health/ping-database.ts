import { runDatabasePing } from "@/infrastructure/database/database-health";

export async function pingDatabase(): Promise<boolean> {
  return runDatabasePing();
}
