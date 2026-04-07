import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDateInputValue } from "@/lib/dates";
import { DocumentStorageType } from "@prisma/client";
import {
  addSpecialistDocument,
  deactivateSpecialist,
  deleteSpecialistDocument,
  updateAffiliation,
  updateSpecialistInsurance,
  uploadSpecialistDocumentFile,
} from "../actions";
import { AppBadge } from "@/components/app/Badge";

export const runtime = "nodejs";

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "No iniciada" },
  { value: "IN_PROCESS", label: "En tramite" },
  { value: "ACTIVE", label: "Activa" },
  { value: "REJECTED", label: "Rechazada" },
  { value: "NOT_POSSIBLE", label: "No posible" },
] as const;

export default async function SpecialistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const specialist = await prisma.specialist.findUnique({
    where: { id },
  });

  if (!specialist) notFound();

  const affiliations = await prisma.affiliation.findMany({
    where: { specialistId: specialist.id },
    include: {
      clinic: { select: { code: true, name: true } },
      insurance: { select: { id: true, name: true, category: true, sortOrder: true, termMonths: true } },
    },
  });

  const documents = await prisma.specialistDocument.findMany({
    where: { specialistId: specialist.id },
    orderBy: { createdAt: "desc" },
  });

  const specialistInsurances = await prisma.specialistInsurance.findMany({
    where: { specialistId: specialist.id },
    include: { insurance: { select: { name: true, category: true, sortOrder: true } } },
    orderBy: [
      { insurance: { category: "asc" } },
      { insurance: { sortOrder: "asc" } },
      { insurance: { name: "asc" } },
    ],
  });

  affiliations.sort((a, b) => {
    const byClinic = a.clinic.code.localeCompare(b.clinic.code);
    if (byClinic !== 0) return byClinic;
    const byCategory = String(a.insurance.category).localeCompare(
      String(b.insurance.category)
    );
    if (byCategory !== 0) return byCategory;
    return a.insurance.sortOrder - b.insurance.sortOrder;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">
            {specialist.lastName}, {specialist.firstName}
          </h1>
          <p className="app-subtitle">
            Actualiza estado, fechas y notas por sede/seguro.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="app-link"
            href={`/especialistas/${specialist.id}/edit`}
          >
            Editar
          </Link>
          <Link className="app-link" href="/especialistas">
            Volver
          </Link>
        </div>
      </div>

      <div className="app-card p-6">
        <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
          <div>
            <span className="text-zinc-500">Email:</span> {specialist.email ?? "-"}
          </div>
          <div>
            <span className="text-zinc-500">Telefono:</span> {specialist.phone ?? "-"}
          </div>
          <div>
            <span className="text-zinc-500">Estado:</span>{" "}
            {specialist.active ? (
              <AppBadge tone="success">Activo</AppBadge>
            ) : (
              <AppBadge tone="neutral">Inactivo</AppBadge>
            )}
          </div>
          <div className="sm:col-span-2">
            <span className="text-zinc-500">Notas:</span> {specialist.notes ?? "-"}
          </div>
        </div>

        {!specialist.active ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Este especialista esta desactivado.
          </div>
        ) : null}

        <form action={deactivateSpecialist} className="mt-4">
          <input type="hidden" name="id" value={specialist.id} />
          <button
            type="submit"
            className="app-btn app-btn-secondary h-9 px-3 text-xs"
          >
            Desactivar
          </button>
        </form>
      </div>

      <section className="app-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Documentos</h2>
            <p className="app-subtitle">
              Podes cargar archivos (local) o guardar links (Drive, PDF, etc.).
            </p>
          </div>
        </div>

        <form
          action={uploadSpecialistDocumentFile}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          <input type="hidden" name="specialistId" value={specialist.id} />
          <label className="app-field sm:col-span-2">
            <span>Archivo</span>
            <input
              type="file"
              name="file"
              required
              className="app-file"
            />
          </label>
          <label className="app-field">
            <span>Descripcion</span>
            <input
              name="description"
              className="app-input"
              placeholder="Opcional"
            />
          </label>
          <button
            type="submit"
            className="app-btn app-btn-primary rounded-xl sm:col-span-1"
          >
            Subir
          </button>
        </form>

        <form action={addSpecialistDocument} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="specialistId" value={specialist.id} />
          <label className="app-field sm:col-span-2">
            <span>URL</span>
            <input
              name="url"
              required
              className="app-input"
              placeholder="https://..."
            />
          </label>
          <label className="app-field">
            <span>Nombre</span>
            <input
              name="originalName"
              className="app-input"
              placeholder="Contrato, PDF, etc."
            />
          </label>
          <label className="app-field sm:col-span-3">
            <span>Descripcion</span>
            <input
              name="description"
              className="app-input"
              placeholder="Opcional"
            />
          </label>
          <button
            type="submit"
            className="app-btn app-btn-primary rounded-xl sm:col-span-1"
          >
            Agregar
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
              <div className="min-w-[240px]">
                {d.storageType === DocumentStorageType.FILE ? (
                  <a
                    className="font-medium text-zinc-900 hover:underline"
                    href={`/api/documents/specialist/${d.id}`}
                  >
                    {d.originalName}
                  </a>
                ) : (
                  <a
                    className="font-medium text-zinc-900 hover:underline"
                    href={d.storedPath}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {d.originalName}
                  </a>
                )}
                <div className="text-xs text-zinc-500">{d.description ?? d.storedPath}</div>
              </div>
              <form action={deleteSpecialistDocument}>
                <input type="hidden" name="specialistId" value={specialist.id} />
                <input type="hidden" name="documentId" value={d.id} />
                <button
                  type="submit"
                  className="app-btn app-btn-secondary h-9 px-3 text-xs"
                >
                  Quitar
                </button>
              </form>
            </div>
          ))}
          {documents.length === 0 ? (
            <div className="app-empty">
              <strong>Sin documentos.</strong> Podes guardar links (Drive, PDF) o subir archivos locales.
            </div>
          ) : null}
        </div>
      </section>

      <section className="app-card">
        <div className="app-card-head">
          <h2 className="text-lg font-semibold tracking-tight">Afiliacion por seguro (global)</h2>
          <p className="app-subtitle">
            Fecha de primera afiliacion por seguro (independiente de la sede).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="app-table min-w-[900px] w-full">
            <thead>
              <tr>
                <th>Seguro</th>
                <th>Categoria</th>
                <th>Primera solicitud</th>
                <th>Primera activacion</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {specialistInsurances.map((si) => (
                <tr key={si.id}>
                  <td className="font-medium text-zinc-900">{si.insurance.name}</td>
                  <td className="text-zinc-600">{si.insurance.category}</td>
                  <td colSpan={4}>
                    <form action={updateSpecialistInsurance} className="grid grid-cols-6 gap-2">
                      <input type="hidden" name="specialistId" value={specialist.id} />
                      <input type="hidden" name="specialistInsuranceId" value={si.id} />

                      <input
                        type="date"
                        name="firstRequestedAt"
                        defaultValue={formatDateInputValue(si.firstRequestedAt)}
                        className="app-input col-span-1 px-2"
                      />
                      <input
                        type="date"
                        name="firstActivatedAt"
                        defaultValue={formatDateInputValue(si.firstActivatedAt)}
                        className="app-input col-span-1 px-2"
                      />
                      <input
                        name="notes"
                        defaultValue={si.notes ?? ""}
                        className="app-input col-span-3"
                        placeholder="Opcional"
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
              {specialistInsurances.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={6}>
                    <div className="app-empty">
                      <strong>Sin registros.</strong> Se crean automaticamente al crear el especialista.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="app-card">
        <div className="app-card-head">
          <h2 className="text-lg font-semibold tracking-tight">Afiliaciones</h2>
          <p className="app-subtitle">
            Esta tabla representa la matriz Especialista x Sede x Seguro.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="app-table min-w-[1100px] w-full">
            <thead>
              <tr>
                <th>Sede</th>
                <th>Seguro</th>
                <th>Estado</th>
                <th>Solicitud</th>
                <th>Activacion</th>
                <th>Vence</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {affiliations.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="whitespace-nowrap">
                    <div className="font-medium text-zinc-900">{a.clinic.code}</div>
                    <div className="text-xs text-zinc-500">{a.clinic.name}</div>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="font-medium text-zinc-900">{a.insurance.name}</div>
                    <div className="text-xs text-zinc-500">{a.insurance.category}</div>
                  </td>
                  <td colSpan={6}>
                    <form action={updateAffiliation} className="grid grid-cols-8 gap-2">
                      <input type="hidden" name="affiliationId" value={a.id} />
                      <input type="hidden" name="specialistId" value={specialist.id} />

                      <select
                        name="status"
                        defaultValue={a.status}
                        className="app-select col-span-1 px-2"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>

                      <input
                        type="date"
                        name="requestedAt"
                        defaultValue={formatDateInputValue(a.requestedAt)}
                        className="app-input col-span-1 px-2"
                      />
                      <input
                        type="date"
                        name="activatedAt"
                        defaultValue={formatDateInputValue(a.activatedAt)}
                        className="app-input col-span-1 px-2"
                      />
                      <input
                        type="date"
                        name="expiresAt"
                        defaultValue={formatDateInputValue(a.expiresAt)}
                        className="app-input col-span-1 px-2"
                      />
                      <textarea
                        name="notes"
                        defaultValue={a.notes ?? ""}
                        rows={1}
                        className="app-textarea col-span-3 min-h-10 resize-y px-2"
                        placeholder="Observacion (por que no se pudo, etc.)"
                      />

                      <button
                        type="submit"
                        className="app-btn app-btn-primary col-span-1 rounded-xl px-3 text-xs"
                      >
                        Guardar
                      </button>
                    </form>
                    <div className="mt-2 text-xs" style={{ color: "var(--app-muted)" }}>
                      Tip: si marcas ACTIVE y cargas Activacion pero dejas Vence vacio, se calcula usando la vigencia del seguro.
                      <Link className="ml-2 font-medium hover:underline" href={`/afiliaciones/${a.id}`}>
                        Documentos
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {affiliations.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={8}>
                    <div className="app-empty">
                      <strong>Sin afiliaciones.</strong> Si recien se creo el especialista, sincroniza la matriz desde el dashboard.
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
