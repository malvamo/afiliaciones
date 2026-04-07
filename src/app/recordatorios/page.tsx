import Link from "next/link";
import { prisma } from "@/lib/db";
import { addMonths, subMonths } from "@/lib/dates";

export const runtime = "nodejs";

export default async function RemindersPage() {
  const now = new Date();
  const horizon = addMonths(now, 3);

  const renewalCandidates = await prisma.affiliation.findMany({
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
    orderBy: { expiresAt: "asc" },
    take: 2000,
  });

  const upcomingRenewals = renewalCandidates
    .map((a) => {
      if (!a.expiresAt) return null;
      const startAt = subMonths(a.expiresAt, a.insurance.renewalLeadMonths);
      if (startAt < now) return null;
      if (startAt > horizon) return null;
      return { a, startAt };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((x, y) => x.startAt.getTime() - y.startAt.getTime())
    .slice(0, 200);

  const activationCandidates = await prisma.affiliation.findMany({
    where: {
      status: { in: ["NOT_STARTED", "IN_PROCESS"] },
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
    orderBy: { requestedAt: "asc" },
    take: 2000,
  });

  const upcomingActivationChecks = activationCandidates
    .map((a) => {
      if (!a.requestedAt) return null;
      const expectedAt = addMonths(a.requestedAt, a.insurance.activationLeadMonths);
      if (expectedAt < now) return null;
      if (expectedAt > horizon) return null;
      return { a, expectedAt };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((x, y) => x.expectedAt.getTime() - y.expectedAt.getTime())
    .slice(0, 200);

  return (
    <div className="space-y-8">
      <section className="app-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="app-title">Recordatorios</h1>
            <p className="app-subtitle">
              Proximos 3 meses: inicio de renovaciones y chequeos de activacion.
            </p>
          </div>
          <Link className="app-link" href="/alertas">
            Volver
          </Link>
        </div>
      </section>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Renovaciones (proximas)</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="app-table min-w-full">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Vence</th>
                <th>Especialista</th>
                <th>Sede</th>
                <th>Seguro</th>
              </tr>
            </thead>
            <tbody>
              {upcomingRenewals.map(({ a, startAt }) => (
                <tr key={a.id} className="text-zinc-800">
                  <td>{startAt.toLocaleDateString()}</td>
                  <td>{a.expiresAt?.toLocaleDateString()}</td>
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
              {upcomingRenewals.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={5}>
                    <div className="app-empty">
                      <strong>Sin items.</strong> No hay renovaciones dentro del horizonte.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Activaciones (chequeo)</h2>
        <p className="app-subtitle">Fecha estimada segun lead de activacion del seguro.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="app-table min-w-full">
            <thead>
              <tr>
                <th>Esperada</th>
                <th>Solicitada</th>
                <th>Especialista</th>
                <th>Sede</th>
                <th>Seguro</th>
              </tr>
            </thead>
            <tbody>
              {upcomingActivationChecks.map(({ a, expectedAt }) => (
                <tr key={a.id} className="text-zinc-800">
                  <td>{expectedAt.toLocaleDateString()}</td>
                  <td>{a.requestedAt?.toLocaleDateString()}</td>
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
              {upcomingActivationChecks.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={5}>
                    <div className="app-empty">
                      <strong>Sin items.</strong> No hay chequeos de activacion dentro del horizonte.
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
