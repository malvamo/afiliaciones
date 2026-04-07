import Link from "next/link";
import { prisma } from "@/lib/db";
import { addMonths, subMonths } from "@/lib/dates";
import { AffiliationStatusBadge } from "@/components/app/StatusBadges";

export const runtime = "nodejs";

export default async function AlertsPage() {
  const now = new Date();

  const [countsByStatus, dueRenewal, dueActivation] = await Promise.all([
    prisma.affiliation.groupBy({
      by: ["status"],
      where: {
        specialist: { active: true },
        clinic: { active: true },
        insurance: { active: true },
      },
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.affiliation.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { not: null },
        renewalStatus: "NOT_STARTED",
        specialist: { active: true },
        clinic: { active: true },
        insurance: { active: true },
      },
      include: {
        specialist: { select: { id: true, firstName: true, lastName: true } },
        clinic: { select: { code: true, name: true } },
        insurance: { select: { name: true, renewalLeadMonths: true } },
      },
    }),
    prisma.affiliation.findMany({
      where: {
        status: { in: ["IN_PROCESS", "NOT_STARTED"] },
        requestedAt: { not: null },
        activatedAt: null,
        specialist: { active: true },
        clinic: { active: true },
        insurance: { active: true },
      },
      include: {
        specialist: { select: { id: true, firstName: true, lastName: true } },
        clinic: { select: { code: true, name: true } },
        insurance: { select: { name: true, activationLeadMonths: true } },
      },
    }),
  ]);

  const renewalItems = dueRenewal
    .map((a) => {
      if (!a.expiresAt) return null;
      const startAt = subMonths(a.expiresAt, a.insurance.renewalLeadMonths);
      return { a, startAt };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .filter((x) => x.startAt <= now)
    .sort((x, y) => x.a.expiresAt!.getTime() - y.a.expiresAt!.getTime())
    .slice(0, 50);

  const activationItems = dueActivation
    .map((a) => {
      if (!a.requestedAt) return null;
      const expectedAt = addMonths(a.requestedAt, a.insurance.activationLeadMonths);
      return { a, expectedAt };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .filter((x) => x.expectedAt <= now)
    .sort((x, y) => x.expectedAt.getTime() - y.expectedAt.getTime())
    .slice(0, 50);

  const statusCount = (status: string) =>
    countsByStatus.find((c) => c.status === status)?._count._all ?? 0;

  const nonActiveSample = await prisma.affiliation.findMany({
    where: {
      status: { not: "ACTIVE" },
      specialist: { active: true },
      clinic: { active: true },
      insurance: { active: true },
    },
    include: {
      specialist: { select: { id: true, firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-8">
      <section className="app-card p-6">
        <h1 className="app-title">Alertas</h1>
        <p className="app-subtitle">
          Renovaciones, activaciones demoradas y afiliaciones pendientes.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="app-kpi">
            <div className="app-kpi-label">No iniciadas</div>
            <div className="app-kpi-value">{statusCount("NOT_STARTED")}</div>
          </div>
          <div className="app-kpi">
            <div className="app-kpi-label">En tramite</div>
            <div className="app-kpi-value">{statusCount("IN_PROCESS")}</div>
          </div>
          <div className="app-kpi">
            <div className="app-kpi-label">Activas</div>
            <div className="app-kpi-value">{statusCount("ACTIVE")}</div>
          </div>
          <div className="app-kpi">
            <div className="app-kpi-label">Rechazadas</div>
            <div className="app-kpi-value">{statusCount("REJECTED")}</div>
          </div>
          <div className="app-kpi">
            <div className="app-kpi-label">No posible</div>
            <div className="app-kpi-value">{statusCount("NOT_POSSIBLE")}</div>
          </div>
        </div>
      </section>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Renovaciones a iniciar</h2>
        <p className="app-subtitle">
          Activas con vencimiento y lead de renovacion cumplido.
        </p>

        <div className="mt-3">
          <Link
            className="app-btn app-btn-secondary h-9 px-3 text-xs"
            href="/renovaciones"
          >
            Gestionar renovaciones
          </Link>
        </div>

        {renewalItems.length === 0 ? (
          <div className="mt-4 app-empty">
            <strong>Sin items.</strong> No hay renovaciones a iniciar por ahora.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="app-table min-w-full">
              <thead>
                <tr>
                  <th>Especialista</th>
                  <th>Sede</th>
                  <th>Seguro</th>
                  <th>Iniciar</th>
                  <th>Vence</th>
                </tr>
              </thead>
              <tbody>
                {renewalItems.map(({ a, startAt }) => (
                  <tr key={a.id} className="text-zinc-800">
                    <td>
                      <Link className="font-medium hover:underline" href={`/especialistas/${a.specialist.id}`}>
                        {a.specialist.lastName}, {a.specialist.firstName}
                      </Link>
                    </td>
                    <td>
                      {a.clinic.code} - {a.clinic.name}
                    </td>
                    <td>{a.insurance.name}</td>
                    <td>{startAt.toLocaleDateString()}</td>
                    <td>{a.expiresAt?.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Activaciones demoradas</h2>
        <p className="app-subtitle">
          Solicitudes con fecha de solicitud cargada pero sin activacion, superando el lead esperado del seguro.
        </p>

        {activationItems.length === 0 ? (
          <div className="mt-4 app-empty">
            <strong>Sin items.</strong> No hay activaciones demoradas por ahora.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="app-table min-w-full">
              <thead>
                <tr>
                  <th>Especialista</th>
                  <th>Sede</th>
                  <th>Seguro</th>
                  <th>Solicitada</th>
                  <th>Esperada</th>
                </tr>
              </thead>
              <tbody>
                {activationItems.map(({ a, expectedAt }) => (
                  <tr key={a.id} className="text-zinc-800">
                    <td>
                      <Link className="font-medium hover:underline" href={`/especialistas/${a.specialist.id}`}>
                        {a.specialist.lastName}, {a.specialist.firstName}
                      </Link>
                    </td>
                    <td>
                      {a.clinic.code} - {a.clinic.name}
                    </td>
                    <td>{a.insurance.name}</td>
                    <td>{a.requestedAt?.toLocaleDateString()}</td>
                    <td>{expectedAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="app-card">
        <div className="app-card-head">
          <h2 className="text-lg font-semibold tracking-tight">Pendientes (muestra)</h2>
          <p className="app-subtitle">
            Primeros 200 registros no activos. Para ver el detalle completo y exportar, usa la seccion Pendientes.
          </p>
          <div className="mt-3">
            <Link
              className="app-btn app-btn-secondary h-9 px-3 text-xs"
              href="/pendientes"
            >
              Ver pendientes completos
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="app-table min-w-full">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Especialista</th>
                <th>Sede</th>
                <th>Seguro</th>
              </tr>
            </thead>
            <tbody>
              {nonActiveSample.map((a) => (
                <tr key={a.id} className="text-zinc-800">
                  <td>
                    <AffiliationStatusBadge status={a.status} />
                  </td>
                  <td>
                    <Link className="font-medium hover:underline" href={`/especialistas/${a.specialist.id}`}>
                      {a.specialist.lastName}, {a.specialist.firstName}
                    </Link>
                  </td>
                  <td>
                    {a.clinic.code} - {a.clinic.name}
                  </td>
                  <td>{a.insurance.name}</td>
                </tr>
              ))}
              {nonActiveSample.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={4}>
                    <div className="app-empty">
                      <strong>Sin pendientes.</strong> Todo OK: no hay afiliaciones no activas.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
