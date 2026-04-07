import Link from "next/link";
import { prisma } from "@/lib/db";
import { subMonths } from "@/lib/dates";
import { startRenewal, updateRenewal } from "./actions";

export const runtime = "nodejs";

const RENEWAL_OPTIONS = [
  "NOT_STARTED",
  "STARTED",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
] as const;

export default async function RenewalsPage() {
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
    take: 1000,
  });

  const due = active
    .map((a) => {
      if (!a.expiresAt) return null;
      const startAt = subMonths(a.expiresAt, a.insurance.renewalLeadMonths);
      if (startAt > now) return null;
      return { a, startAt };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .filter((x) => x.a.renewalStatus === "NOT_STARTED")
    .slice(0, 200);

  const inProgress = await prisma.affiliation.findMany({
    where: {
      status: "ACTIVE",
      renewalStatus: { not: "NOT_STARTED" },
      specialist: { active: true },
      clinic: { active: true },
      insurance: { active: true },
    },
    include: {
      specialist: { select: { id: true, firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true } },
    },
    orderBy: [{ renewalStartedAt: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-8">
      <section className="app-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="app-title">Renovaciones</h1>
            <p className="app-subtitle">
              Inicia y hace seguimiento del proceso de renovacion.
            </p>
          </div>
          <Link className="app-link" href="/alertas">
            Volver a alertas
          </Link>
        </div>
      </section>

      <section className="app-card">
        <div className="app-card-head">
          <h2 className="text-lg font-semibold tracking-tight">A iniciar</h2>
          <p className="app-subtitle">Lead de renovacion ya cumplido y aun no iniciada.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="app-table min-w-[900px] w-full">
            <thead>
              <tr>
                <th>Especialista</th>
                <th>Sede</th>
                <th>Seguro</th>
                <th>Iniciar</th>
                <th>Vence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {due.map(({ a, startAt }) => (
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
                  <td>
                    <form action={startRenewal}>
                      <input type="hidden" name="affiliationId" value={a.id} />
                      <button
                        type="submit"
                        className="app-btn app-btn-primary h-9 px-3 text-xs"
                      >
                        Iniciar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {due.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={6}>
                    <div className="app-empty">
                      <strong>Sin items.</strong> No hay renovaciones a iniciar.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-card">
        <div className="app-card-head">
          <h2 className="text-lg font-semibold tracking-tight">En curso</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="app-table min-w-[1100px] w-full">
            <thead>
              <tr>
                <th>Especialista</th>
                <th>Sede</th>
                <th>Seguro</th>
                <th>Estado</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inProgress.map((a) => (
                <tr key={a.id} className="align-top text-zinc-800">
                  <td>
                    <Link className="font-medium hover:underline" href={`/especialistas/${a.specialist.id}`}>
                      {a.specialist.lastName}, {a.specialist.firstName}
                    </Link>
                  </td>
                  <td>
                    {a.clinic.code} - {a.clinic.name}
                  </td>
                  <td>{a.insurance.name}</td>
                  <td colSpan={3}>
                    <form action={updateRenewal} className="grid grid-cols-8 gap-2">
                      <input type="hidden" name="affiliationId" value={a.id} />
                      <select
                        name="renewalStatus"
                        defaultValue={a.renewalStatus}
                        className="app-select col-span-1"
                      >
                        {RENEWAL_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                      <input
                        name="renewalNotes"
                        defaultValue={a.renewalNotes ?? ""}
                        className="app-input col-span-4"
                        placeholder="Notas"
                      />
                      <input
                        type="date"
                        name="newExpiresAt"
                        className="app-input col-span-2 px-2"
                        title="Opcional: al completar, fija el vencimiento real"
                      />
                      <button
                        type="submit"
                        className="app-btn app-btn-primary col-span-1 rounded-xl px-3 text-xs"
                      >
                        Guardar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {inProgress.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={6}>
                    <div className="app-empty">
                      <strong>Sin renovaciones en curso.</strong> Cuando inicies una, aparece aca para hacer seguimiento.
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
