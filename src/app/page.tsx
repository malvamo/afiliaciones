import Link from "next/link";
import { prisma } from "@/lib/db";
import { subMonths } from "@/lib/dates";
import { syncAffiliationsMatrix } from "@/app/actions";

export const runtime = "nodejs";

export default async function Home() {
  const [specialistsCount, clinicsCount, insurancesCount, affiliationsCount] =
    await Promise.all([
      prisma.specialist.count({ where: { active: true } }),
      prisma.clinic.count({ where: { active: true } }),
      prisma.insurance.count({ where: { active: true } }),
      prisma.affiliation.count({
        where: {
          specialist: { active: true },
          clinic: { active: true },
          insurance: { active: true },
        },
      }),
    ]);

  const expectedAffiliationsCount =
    specialistsCount * clinicsCount * insurancesCount;
  const missingAffiliationsCount = Math.max(
    0,
    expectedAffiliationsCount - affiliationsCount
  );

  const now = new Date();
  const active = await prisma.affiliation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { not: null },
      specialist: { active: true },
      clinic: { active: true },
      insurance: { active: true },
    },
    include: {
      specialist: { select: { id: true, firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true, renewalLeadMonths: true } },
    },
    orderBy: { expiresAt: "asc" },
    take: 50,
  });

  const dueRenewals = active
    .map((a) => {
      if (!a.expiresAt) return null;
      const startAt = subMonths(a.expiresAt, a.insurance.renewalLeadMonths);
      return { a, startAt };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .filter((x) => x.startAt <= now)
    .slice(0, 15);

  return (
    <div className="space-y-8">
      <section className="app-card p-6">
        <h1 className="app-title">Dashboard</h1>
        <p className="app-subtitle">Estado general de la matriz de afiliaciones.</p>

        <div className="app-kpi-grid">
          <div className="app-kpi">
            <div className="app-kpi-label">Especialistas</div>
            <div className="app-kpi-value">{specialistsCount}</div>
          </div>
          <div className="app-kpi">
            <div className="app-kpi-label">Sedes</div>
            <div className="app-kpi-value">{clinicsCount}</div>
          </div>
          <div className="app-kpi">
            <div className="app-kpi-label">Seguros</div>
            <div className="app-kpi-value">{insurancesCount}</div>
          </div>
          <div className="app-kpi">
            <div className="app-kpi-label">Afiliaciones</div>
            <div className="app-kpi-value">{affiliationsCount}</div>
            <div className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>
              Esperadas: {expectedAffiliationsCount}
            </div>
          </div>
        </div>

        {missingAffiliationsCount > 0 ? (
          <form action={syncAffiliationsMatrix} className="mt-4">
            <div className="app-card-muted p-4 text-sm">
              Faltan {missingAffiliationsCount} afiliaciones en la matriz (por sedes/seguros nuevos o datos viejos).
              <button
                type="submit"
                className="ml-3 app-btn app-btn-warn h-9 px-3 text-xs"
              >
                Sincronizar matriz
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <Link
            className="app-btn app-btn-primary"
            href="/especialistas/new"
          >
            Agregar especialista
          </Link>
          <Link
            className="app-btn app-btn-secondary"
            href="/especialistas"
          >
            Ver especialistas
          </Link>
        </div>
      </section>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Renovaciones a iniciar</h2>
        <p className="app-subtitle">
          Afiliaciones activas cuyo periodo de renovacion ya deberia estar en curso.
        </p>

        {dueRenewals.length === 0 ? (
          <div className="mt-4 app-empty">
            <strong>Sin renovaciones.</strong> No hay items para iniciar (o todavia no hay vencimientos cargados).
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="app-table min-w-full">
              <thead>
                <tr>
                  <th className="py-2 pr-4">Especialista</th>
                  <th className="py-2 pr-4">Sede</th>
                  <th className="py-2 pr-4">Seguro</th>
                  <th className="py-2 pr-4">Iniciar</th>
                  <th className="py-2 pr-4">Vence</th>
                </tr>
              </thead>
              <tbody>
                {dueRenewals.map(({ a, startAt }) => (
                  <tr key={a.id} className="text-zinc-800">
                    <td className="py-2 pr-4">
                      <Link
                        className="font-medium hover:underline"
                        href={`/especialistas/${a.specialist.id}`}
                      >
                        {a.specialist.lastName}, {a.specialist.firstName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      {a.clinic.code} - {a.clinic.name}
                    </td>
                    <td className="py-2 pr-4">{a.insurance.name}</td>
                    <td className="py-2 pr-4">{startAt.toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{a.expiresAt?.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
