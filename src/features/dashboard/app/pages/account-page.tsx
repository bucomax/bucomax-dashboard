import { DashboardPage } from "@/shared/components/layout/dashboard-page";

export function AccountPage() {
  return (
    <DashboardPage
      title="Conta"
      description="Perfil, e-mail e senha — alinhado a GET/PATCH /api/v1/me e POST /api/v1/me/password (fase F3)."
    >
      <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
        <p className="text-muted-foreground text-sm">
          Formulário de dados pessoais e alteração de senha.
        </p>
      </div>
    </DashboardPage>
  );
}
