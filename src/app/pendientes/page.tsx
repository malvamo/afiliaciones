import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { AffiliationStatusBadge } from "@/components/app/StatusBadges";

export const runtime = "nodejs";

const STATUS_OPTIONS = [
  { value: "", label: "(todas)" },
  { value: "NOT_STARTED", label: "NOT_STARTED" },
  { value: "IN_PROCESS", label: "IN_PROCESS" },
  { value: "REJECTED", label: "REJECTED" },
  { value: "NOT_POSSIBLE", label: "NOT_POSSIBLE" },
] as const;

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const status = safeString(searchParams.status);
  const clinicCode = safeString(searchParams.clinic);
  const insuranceName = safeString(searchParams.insurance);
  const q = safeString(searchParams.q).trim();

  const [clinics, insurances] = await Promise.all([
    prisma.clinic.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.insurance.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const clinicId = clinics.find((c) => c.code === clinicCode)?.id ?? null;
  const insuranceId =
    insurances.find((i) => i.name === insuranceName)?.id ?? null;

  const allowedStatuses = new Set([
    "NOT_STARTED",
    "IN_PROCESS",
    "REJECTED",
    "NOT_POSSIBLE",
  ]);
  const statusFilter = allowedStatuses.has(status) ? status : null;

  const where = {
    status: statusFilter ? statusFilter : { in: Array.from(allowedStatuses) },
    specialist: { active: true },
    clinic: { active: true },
    insurance: { active: true },
    ...(clinicId ? { clinicId } : {}),
    ...(insuranceId ? { insuranceId } : {}),
    ...(q
      ? {
          specialist: {
            active: true,
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
            ],
          },
        }
      : {}),
  } satisfies Prisma.AffiliationWhereInput;

  const [rows, byClinic, byInsurance] = await Promise.all([
    prisma.affiliation.findMany({
      where,
      include: {
        specialist: { select: { id: true, firstName: true, lastName: true } },
        clinic: { select: { code: true, name: true } },
        insurance: { select: { name: true, category: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 500,
    }),
    prisma.affiliation.groupBy({
      by: ["clinicId", "status"],
      where,
      _count: { _all: true },
      orderBy: [{ clinicId: "asc" }, { status: "asc" }],
    }),
    prisma.affiliation.groupBy({
      by: ["insuranceId", "status"],
      where,
      _count: { _all: true },
      orderBy: [{ insuranceId: "asc" }, { status: "asc" }],
    }),
  ]);

  const exportUrl = `/api/export/pending?status=${encodeURIComponent(status)}&clinic=${encodeURIComponent(clinicCode)}&insurance=${encodeURIComponent(insuranceName)}&q=${encodeURIComponent(q)}`;

  const clinicById = new Map(clinics.map((c) => [c.id, c] as const));
  const insuranceById = new Map(insurances.map((i) => [i.id, i] as const));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">Pendientes</h1>
          <p className="app-subtitle">
            Listado completo (filtrable) de afiliaciones NO activas.
          </p>
        </div>
        <a
          className="app-btn app-btn-secondary"
          href={exportUrl}
        >
          Export CSV
        </a>
      </div>

      <form className="app-card p-6" method="GET">
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="app-field">
            <span>Estado</span>
            <select
              name="status"
              defaultValue={status}
              className="app-select"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="app-field">
            <span>Sede</span>
            <select
              name="clinic"
              defaultValue={clinicCode}
              className="app-select"
            >
              <option value="">(todas)</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="app-field">
            <span>Seguro</span>
            <select
              name="insurance"
              defaultValue={insuranceName}
              className="app-select"
            >
              <option value="">(todos)</option>
              {insurances.map((i) => (
                <option key={i.id} value={i.name}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>

          <label className="app-field">
            <span>Buscar</span>
            <input
              name="q"
              defaultValue={q}
              className="app-input"
              placeholder="Nombre / apellido / email"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            className="app-btn app-btn-primary"
          >
            Aplicar filtros
          </button>
          <Link
            className="app-btn app-btn-secondary"
            href="/pendientes"
          >
            Limpiar
          </Link>
          <div className="text-xs text-zinc-500">Limite UI: 500 filas</div>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="app-card p-6">
          <h2 className="text-lg font-semibold tracking-tight">Por sede</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="app-table min-w-full">
              <thead>
                <tr>
                  <th>Sede</th>
                  <th>Estado</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {byClinic.map((r) => {
                  const c = clinicById.get(r.clinicId);
                  return (
                    <tr key={`${r.clinicId}:${r.status}`} className="text-zinc-800">
                      <td>{c ? `${c.code} - ${c.name}` : r.clinicId}</td>
                      <td>
                        <AffiliationStatusBadge status={String(r.status)} />
                      </td>
                      <td>{r._count._all}</td>
                    </tr>
                  );
                })}
                {byClinic.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6" colSpan={3}>
                      <div className="app-empty">
                        <strong>Sin datos.</strong> No hay resultados para estos filtros.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-card p-6">
          <h2 className="text-lg font-semibold tracking-tight">Por seguro</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="app-table min-w-full">
              <thead>
                <tr>
                  <th>Seguro</th>
                  <th>Estado</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {byInsurance.map((r) => {
                  const i = insuranceById.get(r.insuranceId);
                  return (
                    <tr key={`${r.insuranceId}:${r.status}`} className="text-zinc-800">
                      <td>{i ? i.name : r.insuranceId}</td>
                      <td>
                        <AffiliationStatusBadge status={String(r.status)} />
                      </td>
                      <td>{r._count._all}</td>
                    </tr>
                  );
                })}
                {byInsurance.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6" colSpan={3}>
                      <div className="app-empty">
                        <strong>Sin datos.</strong> No hay resultados para estos filtros.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="app-card">
        <div className="app-card-head">
          <h2 className="text-lg font-semibold tracking-tight">Listado</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="app-table min-w-full">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Especialista</th>
                <th>Sede</th>
                <th>Seguro</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
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
                  <td className="text-zinc-600">{a.notes ?? ""}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={5}>
                    <div className="app-empty">
                      <strong>Sin pendientes.</strong> Proba ajustar filtros o limpiar la busqueda.
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
