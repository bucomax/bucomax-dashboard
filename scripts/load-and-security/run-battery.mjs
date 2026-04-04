#!/usr/bin/env node
/**
 * Roda, em sequência, stampede + carga pesada + probes + rate limit.
 * Mostra um indicador no terminal (spinner + segundos) enquanto cada etapa roda.
 *
 *   npm run stress:all
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));

const SPIN_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * @param {string} name
 * @param {string} file
 * @returns {Promise<void>}
 */
function run(name, file) {
  console.log(`\n\n████████████████ ${name} ████████████████\n`);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(dir, file)], {
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    let frameI = 0;
    const t0 = Date.now();
    const tickMs = Number(process.env.STRESS_SPIN_MS ?? 250);
    const interval = setInterval(() => {
      const sec = Math.floor((Date.now() - t0) / 1000);
      const fr = SPIN_FRAMES[frameI++ % SPIN_FRAMES.length];
      process.stderr.write(
        `\r\x1b[36m${fr}\x1b[0m \x1b[1m${name}\x1b[0m em execução — \x1b[33m${sec}s\x1b[0m   `,
      );
    }, tickMs);

    child.on("close", (code) => {
      clearInterval(interval);
      process.stderr.write("\r\x1b[K");
      if (code !== 0 && code != null) {
        console.error(`\nParado: ${name} saiu com código ${code}`);
        process.exit(code);
      }
      resolve();
    });

    child.on("error", (err) => {
      clearInterval(interval);
      process.stderr.write("\r\x1b[K");
      reject(err);
    });
  });
}

async function main() {
  try {
    await run("Stampede (pico)", "run-stampede.mjs");
    await run("Heavy load", "run-load-heavy.mjs");
    await run("Security probes", "run-security-probes.mjs");
    await run("Rate limit suite", "run-rate-limit-suite.mjs");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  console.log("\n\nBateria completa terminou sem abortar por código de saída ≠ 0.\n");
}

main();
