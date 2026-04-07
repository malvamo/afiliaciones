import { prisma } from "@/lib/db";
import { createClinic, updateClinic } from "./actions";

export const runtime = "nodejs";

export default async function ClinicsPage() {
  const clinics = await prisma.clinic.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-title">Sedes</h1>
        <p className="app-subtitle">Crea y administra sedes/clinicas.</p>
      </div>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Nueva sede</h2>
        <form action={createClinic} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="app-field">
            <span>Codigo</span>
            <input
              name="code"
              required
              className="app-input"
              placeholder="NL"
            />
          </label>
          <label className="app-field sm:col-span-2">
            <span>Nombre</span>
            <input
              name="name"
              required
              className="app-input"
              placeholder="North Lauderdale"
            />
          </label>
          <button
            type="submit"
            className="app-btn app-btn-primary rounded-xl"
          >
            Crear
          </button>
        </form>
      </section>

      <section className="app-card">
        <div className="app-card-head">
          <h2 className="text-lg font-semibold tracking-tight">Listado</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="app-table min-w-[900px] w-full">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Activo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => (
                <tr key={c.id} className="text-zinc-800">
                  <td className="font-medium">{c.code}</td>
                  <td colSpan={3}>
                    <form action={updateClinic} className="grid grid-cols-4 gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      <input
                        name="code"
                        defaultValue={c.code}
                        className="app-input col-span-1"
                      />
                      <input
                        name="name"
                        defaultValue={c.name}
                        className="app-input col-span-2"
                      />
                      <label className="col-span-1 flex items-center gap-2 text-sm">
                        <input type="checkbox" name="active" defaultChecked={c.active} className="h-4 w-4" />
                        <span>Activo</span>
                      </label>
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
              {clinics.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={4}>
                    <div className="app-empty">
                      <strong>Sin sedes.</strong> Crea la primera para habilitar la matriz.
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
