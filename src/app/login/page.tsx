import { login, logout } from "./actions";

export const runtime = "nodejs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const nextPath = typeof searchParams.next === "string" ? searchParams.next : "/";
  const error = searchParams.error === "1";

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="app-card p-6">
        <h1 className="app-title">Login</h1>
        <p className="app-subtitle">
          Proteccion simple por password (solo si `APP_PASSWORD` esta configurado).
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950">
            Password incorrecta.
          </div>
        ) : null}

        <form action={login} className="mt-4 grid gap-3">
          <input type="hidden" name="next" value={nextPath} />
          <label className="app-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              required
              className="app-input"
            />
          </label>
          <button
            type="submit"
            className="app-btn app-btn-primary rounded-xl"
          >
            Entrar
          </button>
        </form>

        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="app-btn app-btn-secondary w-full rounded-xl"
          >
            Salir
          </button>
        </form>
      </div>
    </div>
  );
}
