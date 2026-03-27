import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Logado como <strong>{session.user.email}</strong> ({session.user.globalRole})
        {session.user.tenantId ? (
          <>
            {" "}
            · tenant <code className="rounded bg-zinc-100 px-1 text-sm dark:bg-zinc-800">{session.user.tenantId}</code>{" "}
            ({session.user.tenantRole ?? "—"})
          </>
        ) : null}
      </p>
      <ul className="mt-6 list-inside list-disc text-sm">
        <li>
          <Link href="/api-doc" className="text-blue-600 underline dark:text-blue-400">
            Documentação da API (Scalar)
          </Link>
        </li>
        <li>
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">GET /api/v1/me</code> (com sessão)
        </li>
      </ul>
    </main>
  );
}
