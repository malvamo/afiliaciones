import Link from "next/link";
import { createSpecialist } from "../actions";

export default function NewSpecialistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">Nuevo especialista</h1>
          <p className="app-subtitle">
            Al crear el especialista se generan automaticamente todas las afiliaciones
            (todas las sedes x todos los seguros) en estado NO INICIADA.
          </p>
        </div>
        <Link className="app-link" href="/especialistas">
          Volver
        </Link>
      </div>

      <form
        action={createSpecialist}
        className="app-card p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="app-field">
            <span>Nombre</span>
            <input
              name="firstName"
              required
              className="app-input"
            />
          </label>

          <label className="app-field">
            <span>Apellido</span>
            <input
              name="lastName"
              required
              className="app-input"
            />
          </label>

          <label className="app-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              className="app-input"
            />
          </label>

          <label className="app-field">
            <span>Telefono</span>
            <input
              name="phone"
              className="app-input"
            />
          </label>

          <label className="app-field sm:col-span-2">
            <span>Notas</span>
            <textarea
              name="notes"
              rows={4}
              className="app-textarea"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            className="app-btn app-btn-primary"
          >
            Crear
          </button>
          <Link
            className="app-btn app-btn-secondary"
            href="/especialistas"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
