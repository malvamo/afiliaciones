import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateInsurance } from "../actions";

export const runtime = "nodejs";

export default async function InsuranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const insurance = await prisma.insurance.findUnique({
    where: { id },
  });

  if (!insurance) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">{insurance.name}</h1>
          <p className="app-subtitle">
            Categoria: <span className="font-medium">{insurance.category}</span>
          </p>
        </div>
        <Link className="app-link" href="/seguros">
          Volver
        </Link>
      </div>

      <form action={updateInsurance} className="app-card p-6">
        <input type="hidden" name="id" value={insurance.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="app-field">
            <span>Vigencia (meses)</span>
            <input
              type="number"
              min={0}
              name="termMonths"
              defaultValue={insurance.termMonths}
              className="app-input"
            />
            <span className="app-help">Ej: 12 (1 ano), 24, 36.</span>
          </label>

          <label className="app-field">
            <span>Lead renovacion (meses)</span>
            <input
              type="number"
              min={0}
              name="renewalLeadMonths"
              defaultValue={insurance.renewalLeadMonths}
              className="app-input"
            />
            <span className="app-help">Cuanto antes del vencimiento hay que iniciar.</span>
          </label>

          <label className="app-field">
            <span>Lead activacion (meses)</span>
            <input
              type="number"
              min={0}
              name="activationLeadMonths"
              defaultValue={insurance.activationLeadMonths}
              className="app-input"
            />
            <span className="app-help">Tiempo esperado desde solicitud a activacion.</span>
          </label>

          <label className="app-field">
            <span>Orden</span>
            <input
              type="number"
              min={0}
              name="sortOrder"
              defaultValue={insurance.sortOrder}
              className="app-input"
            />
          </label>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={insurance.active}
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
            href="/seguros"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
