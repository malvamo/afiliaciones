import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteSpecialist, updateSpecialist } from "../../actions";

export const runtime = "nodejs";

export default async function EditSpecialistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const specialist = await prisma.specialist.findUnique({
    where: { id },
  });
  if (!specialist) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">Editar especialista</h1>
          <p className="app-subtitle">
            Actualiza datos basicos y estado.
          </p>
        </div>
        <Link
          className="app-link"
          href={`/especialistas/${specialist.id}`}
        >
          Volver
        </Link>
      </div>

      <form
        action={updateSpecialist}
        className="app-card p-6"
      >
        <input type="hidden" name="id" value={specialist.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="app-field">
            <span>Nombre</span>
            <input
              name="firstName"
              required
              defaultValue={specialist.firstName}
              className="app-input"
            />
          </label>

          <label className="app-field">
            <span>Apellido</span>
            <input
              name="lastName"
              required
              defaultValue={specialist.lastName}
              className="app-input"
            />
          </label>

          <label className="app-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              defaultValue={specialist.email ?? ""}
              className="app-input"
            />
          </label>

          <label className="app-field">
            <span>Telefono</span>
            <input
              name="phone"
              defaultValue={specialist.phone ?? ""}
              className="app-input"
            />
          </label>

          <label className="app-field sm:col-span-2">
            <span>Notas</span>
            <textarea
              name="notes"
              rows={4}
              defaultValue={specialist.notes ?? ""}
              className="app-textarea"
            />
          </label>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={specialist.active}
              className="h-4 w-4"
            />
            <span className="font-medium text-zinc-800">Activo</span>
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            className="app-btn app-btn-primary"
          >
            Guardar
          </button>
          <Link
            className="app-btn app-btn-secondary"
            href={`/especialistas/${specialist.id}`}
          >
            Cancelar
          </Link>
        </div>
      </form>

      <section className="app-card p-6" style={{ borderColor: "rgba(185, 28, 28, 0.25)" }}>
        <h2 className="text-lg font-semibold tracking-tight text-red-900">Zona peligrosa</h2>
        <p className="app-subtitle">
          Eliminar borra el especialista y todas sus afiliaciones/documentos.
        </p>

        <form action={deleteSpecialist} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="id" value={specialist.id} />
          <label className="app-field sm:col-span-2">
            <span>Escribi DELETE para confirmar</span>
            <input
              name="confirm"
              className="app-input"
            />
          </label>
          <button
            type="submit"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-600"
          >
            Eliminar
          </button>
        </form>
      </section>
    </div>
  );
}
