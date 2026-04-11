import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Carrega `.env` na raiz (sem dependência `dotenv`). */
export function loadRootEnv(): void {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  const lines = readFileSync(p, "utf8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}
