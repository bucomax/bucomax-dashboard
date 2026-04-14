import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const STATE_FILE = resolve(process.cwd(), "e2e", ".invite-state.json");

type InviteState = {
  tenantSlug: string;
  tokenUi: string;
  tokenApi: string;
  pathUi: string;
};

/** CPF válido (apenas para teste automatizado). */
const TEST_CPF_DIGITS = "52998224725";

/** CardTitle é `div`; locale pode ser pt-BR ou en. */
const FORM_TITLE = /Cadastro de paciente|Patient registration/;
const SUCCESS_TITLE = /Obrigado!|Thank you!/;
/** Confirma cópia de sucesso + expectativa de contato da clínica (sem prometer e-mail ao paciente). */
const SUCCESS_BODY = /cadastro foi concluído|registration was completed/i;
const SUCCESS_CONTACT_HINT =
  /e-mail automático de confirmação|automatic confirmation email|entrará em contato|will reach out/i;
const INVALID_TITLE = /Link inválido ou expirado|Invalid or expired link/;

test.describe.configure({ mode: "serial" });

test.describe("Auto-cadastro público (patient-self-register)", () => {
  test("UI: preenche campos, POST 200, tela de sucesso; token vira inválido após uso", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    if (!existsSync(STATE_FILE)) {
      test.skip(true, "Arquivo e2e/.invite-state.json ausente (globalSetup não rodou?)");
    }

    const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as InviteState;
    const { tokenUi, tenantSlug, pathUi } = state;

    const validateGet = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/public/patient-self-register") &&
        res.request().method() === "GET",
      { timeout: 120_000 },
    );
    // `load` dá tempo ao bundle do cliente (ex.: `Button type="submit"` nativo) antes do clique.
    await page.goto(pathUi, { waitUntil: "load", timeout: 120_000 });
    const getRes = await validateGet;
    expect(getRes.status(), "GET validação do token deve retornar 200").toBe(200);

    await expect(page.locator("main").getByText(FORM_TITLE)).toBeVisible({ timeout: 60_000 });

    const suffix = Date.now();
    const uniqueEmail = `e2e.patient.${suffix}@example.com`;

    const regForm = page.getByTestId("patient-self-register-form");

    // Inputs controlados (RHF + máscaras): `pressSequentially` dispara onChange de forma confiável.
    const delay = 8;
    await regForm.locator('input[name="name"]').click();
    await regForm.locator('input[name="name"]').pressSequentially(`Paciente E2E ${suffix}`, { delay });

    await regForm.locator('input[name="phone"]').click();
    await regForm.locator('input[name="phone"]').pressSequentially("11999887766", { delay });

    await regForm.locator('input[name="email"]').click();
    await regForm.locator('input[name="email"]').pressSequentially(uniqueEmail, { delay });

    await regForm.locator('input[name="documentId"]').click();
    await regForm.locator('input[name="documentId"]').pressSequentially(TEST_CPF_DIGITS, { delay });

    const strongPassword = "E2eTest1!";
    await regForm.locator('input[name="password"]').click();
    await regForm.locator('input[name="password"]').pressSequentially(strongPassword, { delay });
    await regForm.locator('input[name="confirmPassword"]').click();
    await regForm.locator('input[name="confirmPassword"]').pressSequentially(strongPassword, { delay });

    await regForm.locator('input[name="acceptTerms"]').check();
    await regForm.locator('input[name="acceptPrivacy"]').check();

    await expect(regForm.locator('[data-slot="field-error"]')).toHaveCount(0);

    await expect(regForm).toHaveAttribute("data-e2e-token-ready", "true");

    const submitBtn = page.getByTestId("patient-self-register-submit");
    await expect(submitBtn).toHaveAttribute("type", "submit");
    await expect(submitBtn).toBeEnabled();

    const postPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/public/patient-self-register") &&
        res.request().method() === "POST",
      { timeout: 60_000 },
    );
    await regForm.evaluate((el) => (el as HTMLFormElement).requestSubmit());
    const postRes = await postPromise;
    expect(postRes.status()).toBe(200);
    const postJson = (await postRes.json()) as { success: boolean; data?: { message: string } };
    expect(postJson.success).toBe(true);
    expect(postJson.data?.message).toBeTruthy();

    const successCard = page.getByTestId("patient-self-register-success");
    await expect(successCard).toBeVisible({ timeout: 30_000 });
    await expect(successCard.getByText(SUCCESS_TITLE)).toBeVisible();
    await expect(successCard.getByText(SUCCESS_BODY)).toBeVisible();
    await expect(successCard.getByText(SUCCESS_CONTACT_HINT)).toBeVisible();

    const secondGet = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/public/patient-self-register") &&
        res.request().method() === "GET",
      { timeout: 60_000 },
    );
    await page.goto(`/${tenantSlug}/patient-self-register?token=${encodeURIComponent(tokenUi)}`, {
      waitUntil: "commit",
      timeout: 120_000,
    });
    await secondGet;

    await expect(page.locator("main").getByText(INVALID_TITLE)).toBeVisible({ timeout: 30_000 });
  });

  test("API: GET valida token; POST cria paciente (corpo mínimo)", async ({ request }) => {
    if (!existsSync(STATE_FILE)) {
      test.skip(true, "e2e/.invite-state.json ausente");
    }

    const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as InviteState;
    const { tokenApi, tenantSlug } = state;

    const headers = {
      "x-public-tenant-slug": tenantSlug,
      "Accept-Language": "pt-BR",
    };

    const getRes = await request.get(
      `/api/v1/public/patient-self-register?token=${encodeURIComponent(tokenApi)}`,
      { headers },
    );
    expect(getRes.ok()).toBeTruthy();
    const getJson = (await getRes.json()) as { success: boolean; data?: { valid: boolean } };
    expect(getJson.success).toBe(true);
    expect(getJson.data?.valid).toBe(true);

    const suffix = Date.now();
    const postRes = await request.post("/api/v1/public/patient-self-register", {
      headers: { ...headers, "Content-Type": "application/json" },
      data: {
        token: tokenApi,
        name: `API E2E ${suffix}`,
        phone: "11988776655",
        email: `e2e.api.${suffix}@example.com`,
        documentId: TEST_CPF_DIGITS,
        isMinor: false,
        password: "ApiE2eTest1!",
        acceptTerms: true,
        acceptPrivacy: true,
      },
    });

    expect(postRes.status()).toBe(200);
    const postJson = (await postRes.json()) as { success: boolean };
    expect(postJson.success).toBe(true);
  });
});
