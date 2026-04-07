import Link from "next/link";
import { prisma } from "@/lib/db";
import { AppBadge } from "@/components/app/Badge";

export const runtime = "nodejs";

export default async function InsurancesPage() {
  const insurances = await prisma.insurance.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="app-title">Seguros</h1>
          <p className="app-subtitle">
            Configura vigencia y tiempos de renovacion/activacion por seguro.
          </p>
        </div>
        <Link
          className="app-btn app-btn-primary"
          href="/seguros/new"
        >
          Nuevo
        </Link>
      </div>

      <div className="app-card">
        <div className="overflow-x-auto">
          <table className="app-table min-w-full">
            <thead>
              <tr>
                <th>Seguro</th>
                <th>Categoria</th>
                <th>Vigencia (meses)</th>
                <th>Lead renovacion (meses)</th>
                <th>Lead activacion (meses)</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {insurances.map((i) => (
                <tr key={i.id} className="text-zinc-800">
                  <td>
                    <Link className="font-medium hover:underline" href={`/seguros/${i.id}`}>
                      {i.name}
                    </Link>
                  </td>
                  <td className="text-zinc-600">{i.category}</td>
                  <td>{i.termMonths}</td>
                  <td>{i.renewalLeadMonths}</td>
                  <td>{i.activationLeadMonths}</td>
                  <td>
                    {i.active ? (
                      <AppBadge tone="success">Activo</AppBadge>
                    ) : (
                      <AppBadge tone="neutral">Inactivo</AppBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
