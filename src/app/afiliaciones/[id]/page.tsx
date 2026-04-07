import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DocumentStorageType } from "@prisma/client";
import { uploadAffiliationDocumentFile, addAffiliationDocument, deleteAffiliationDocument } from "../actions";

export const runtime = "nodejs";

export default async function AffiliationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const affiliation = await prisma.affiliation.findUnique({
    where: { id },
    include: {
      specialist: { select: { id: true, firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true, category: true } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!affiliation) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">Documentos de afiliacion</h1>
          <p className="app-subtitle">
            {affiliation.specialist.lastName}, {affiliation.specialist.firstName} • {affiliation.clinic.code} • {affiliation.insurance.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="app-link"
            href={`/especialistas/${affiliation.specialist.id}`}
          >
            Volver al especialista
          </Link>
        </div>
      </div>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Agregar documento (link)</h2>
        <form action={addAffiliationDocument} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="affiliationId" value={affiliation.id} />
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
              placeholder="Formulario, PDF, etc."
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
            className="app-btn app-btn-primary rounded-xl"
          >
            Agregar
          </button>
        </form>
      </section>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Subir archivo (local)</h2>
        <form
          action={uploadAffiliationDocumentFile}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          <input type="hidden" name="affiliationId" value={affiliation.id} />
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
            className="app-btn app-btn-primary rounded-xl"
          >
            Subir
          </button>
        </form>
      </section>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Documentos</h2>
        <div className="mt-4 space-y-2">
          {affiliation.documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
              <div className="min-w-[240px]">
                {d.storageType === DocumentStorageType.FILE ? (
                  <a
                    className="font-medium text-zinc-900 hover:underline"
                    href={`/api/documents/affiliation/${d.id}`}
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
              <form action={deleteAffiliationDocument}>
                <input type="hidden" name="affiliationId" value={affiliation.id} />
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
          {affiliation.documents.length === 0 ? (
            <div className="app-empty">
              <strong>Sin documentos.</strong> Agrega un link o subi un archivo local.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
