import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">iDoctor</h1>
      <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
        Plataforma em desenvolvimento. Use login para acessar o dashboard ou abra a documentação da API.
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-5 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Entrar
        </Link>
        <Link href="/api-doc" className="rounded-full border border-zinc-300 px-5 py-2 dark:border-zinc-600">
          API (Scalar)
        </Link>
        <Link href="/api/v1/health" className="text-blue-600 underline dark:text-blue-400">
          GET /api/v1/health
        </Link>
      </nav>
    </main>
  );
}
