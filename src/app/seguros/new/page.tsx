import Link from "next/link";
import { createInsurance } from "../actions";

export const runtime = "nodejs";

export default function NewInsurancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">Nuevo seguro</h1>
          <p className="app-subtitle">
            Al crear un seguro se agrega a la matriz para todos los especialistas y sedes activas.
          </p>
        </div>
        <Link className="app-link" href="/seguros">
          Volver
        </Link>
      </div>

      <form action={createInsurance} className="app-card p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="app-field sm:col-span-2">
            <span>Nombre</span>
            <input
              name="name"
              required
              className="app-input"
              placeholder="AETNA"
            />
          </label>

          <label className="app-field">
            <span>Categoria</span>
            <select
              name="category"
              defaultValue="PPO"
              className="app-select"
            >
              <option value="MEDICAID">MEDICAID</option>
              <option value="PPO">PPO</option>
            </select>
          </label>

          <label className="app-field">
            <span>Orden</span>
            <input
              type="number"
              min={0}
              name="sortOrder"
              defaultValue={0}
              className="app-input"
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
            href="/seguros"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
