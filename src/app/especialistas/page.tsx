import Link from "next/link";
import { prisma } from "@/lib/db";
import { AppBadge } from "@/components/app/Badge";

export const runtime = "nodejs";

export default async function SpecialistsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const specialists = await prisma.specialist.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const importOk = searchParams.import === "ok";
  const created = String(searchParams.created ?? "");
  const skipped = String(searchParams.skipped ?? "");
  const errors = String(searchParams.errors ?? "");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">Especialistas</h1>
          <p className="app-subtitle">Alta y seguimiento de afiliaciones por sede y seguro.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="app-btn app-btn-secondary"
            href="/import/especialistas"
          >
            Importar CSV
          </Link>
          <Link
            className="app-btn app-btn-primary"
            href="/especialistas/new"
          >
            Agregar
          </Link>
        </div>
      </div>

      {importOk ? (
        <div className="app-card-muted p-4 text-sm">
          Import terminado. Creados: {created || "0"}. Omitidos: {skipped || "0"}. Errores: {errors || "0"}.
        </div>
      ) : null}

      <div className="app-card">
        <div className="overflow-x-auto">
          <table className="app-table min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefono</th>
                <th className="px-4 py-3">Activo</th>
              </tr>
            </thead>
            <tbody>
              {specialists.map((s) => (
                <tr key={s.id} className="text-zinc-800">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium hover:underline"
                      href={`/especialistas/${s.id}`}
                    >
                      {s.lastName}, {s.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{s.email ?? "-"}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    {s.active ? (
                      <AppBadge tone="success">Activo</AppBadge>
                    ) : (
                      <AppBadge tone="neutral">Inactivo</AppBadge>
                    )}
                  </td>
                </tr>
              ))}
              {specialists.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={4}>
                    <div className="app-empty">
                      <strong>Sin especialistas.</strong> Crea el primero para generar la matriz de afiliaciones.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
