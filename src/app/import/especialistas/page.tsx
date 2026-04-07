import Link from "next/link";
import { importSpecialistsCsv } from "./actions";

export const runtime = "nodejs";

export default function ImportSpecialistsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">Importar especialistas</h1>
          <p className="app-subtitle">
            Sube un CSV para crear especialistas en lote.
          </p>
        </div>
        <Link className="app-link" href="/especialistas">
          Volver
        </Link>
      </div>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Formato CSV</h2>
        <p className="app-subtitle">
          Encabezados requeridos: <span className="font-medium">firstName,lastName</span>. Opcionales: email, phone, notes.
        </p>
        <pre className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-800 overflow-x-auto">
firstName,lastName,email,phone,notes
Ana,Perez,ana@example.com,555-1111,Ortodoncia
Juan,Gomez,,,Nuevo
        </pre>

        <form
          action={importSpecialistsCsv}
          encType="multipart/form-data"
          className="mt-5 grid gap-3 sm:grid-cols-3"
        >
          <label className="app-field sm:col-span-2">
            <span>Archivo CSV</span>
            <input
              type="file"
              name="file"
              accept="text/csv,.csv"
              required
              className="app-file"
            />
          </label>
          <button
            type="submit"
            className="mt-6 app-btn app-btn-primary rounded-xl"
          >
            Importar
          </button>
        </form>
      </section>
    </div>
  );
}
