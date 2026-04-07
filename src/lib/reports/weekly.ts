import "dotenv/config";

import { prisma } from "@/lib/db";
import { optionalEnv } from "@/lib/env";
import { addMonths, subMonths } from "@/lib/dates";
import { createTransport, getMailConfig } from "@/lib/mail";

function formatDate(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toCsv(header: string[], rows: (string | number | null | undefined)[][]) {
  const head = header.map((h) => csvEscape(h)).join(",");
  const lines = rows.map((r) =>
    r.map((v) => csvEscape(String(v ?? ""))).join(",")
  );
  return [head, ...lines].join("\n");
}

type RenewalRow = {
  id: string;
  specialistId: string;
  specialistName: string;
  clinic: string;
  insurance: string;
  startAt: Date;
  expiresAt: Date;
};

type ActivationRow = {
  id: string;
  specialistId: string;
  specialistName: string;
  clinic: string;
  insurance: string;
  requestedAt: Date;
  expectedAt: Date;
  daysOverdue: number;
};

type PendingRow = {
  id: string;
  status: string;
  specialistId: string;
  specialistName: string;
  clinic: string;
  insurance: string;
  notes: string;
};

type MatrixMissingRow = {
  specialistName: string;
  clinic: string;
  insurance: string;
};

type InProgressRenewalRow = {
  id: string;
  specialistId: string;
  specialistName: string;
  clinic: string;
  insurance: string;
  renewalStatus: string;
  expiresAt: Date;
};

export type WeeklyReportResult = {
  ok: true;
  sentTo: string[];
  specialistsCount: number;
  clinicsCount: number;
  insurancesCount: number;
  affiliationsCount: number;
  expectedAffiliationsCount: number;
  missingAffiliationsCount: number;
  matrixMissingSampleCount: number;
  renewalCount: number;
  inProgressRenewalCount: number;
  activationCount: number;
  pendingCount: number;
};

export async function runWeeklyReport(): Promise<WeeklyReportResult> {
  const now = new Date();
  const timeZone = optionalEnv("NOTIFY_TIMEZONE") ?? "America/New_York";
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeScopeWhere = {
    specialist: { active: true },
    clinic: { active: true },
    insurance: { active: true },
  } as const;

  const pendingWhere = {
    ...activeScopeWhere,
    status: { in: ["NOT_STARTED", "IN_PROCESS", "REJECTED", "NOT_POSSIBLE"] },
  } as const;

  const [specialists, clinics, insurances, affiliationsCount] = await Promise.all([
    prisma.specialist.findMany({
      where: { active: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.clinic.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.insurance.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.affiliation.count({ where: activeScopeWhere }),
  ]);

  const specialistsCount = specialists.length;
  const clinicsCount = clinics.length;
  const insurancesCount = insurances.length;

  const expectedAffiliationsCount =
    specialistsCount * clinicsCount * insurancesCount;

  const existingKeys = new Set<string>();
  if (expectedAffiliationsCount > 0) {
    const specialistIds = specialists.map((s) => s.id);
    const clinicIds = clinics.map((c) => c.id);
    const insuranceIds = insurances.map((i) => i.id);

    const existing = await prisma.affiliation.findMany({
      where: {
        specialistId: { in: specialistIds },
        clinicId: { in: clinicIds },
        insuranceId: { in: insuranceIds },
      },
      select: { specialistId: true, clinicId: true, insuranceId: true },
    });
    for (const a of existing) {
      existingKeys.add(`${a.specialistId}:${a.clinicId}:${a.insuranceId}`);
    }
  }

  let missingAffiliationsCount = 0;
  const missingAffiliationsSample: MatrixMissingRow[] = [];
  if (expectedAffiliationsCount > 0) {
    for (const s of specialists) {
      const specialistName = `${s.lastName}, ${s.firstName}`;
      for (const c of clinics) {
        const clinicLabel = `${c.code} - ${c.name}`;
        for (const i of insurances) {
          const key = `${s.id}:${c.id}:${i.id}`;
          if (existingKeys.has(key)) continue;
          missingAffiliationsCount += 1;
          if (missingAffiliationsSample.length < 50) {
            missingAffiliationsSample.push({
              specialistName,
              clinic: clinicLabel,
              insurance: i.name,
            });
          }
        }
      }
    }
  }

  const countsByStatus = await prisma.affiliation.groupBy({
    by: ["status"],
    where: activeScopeWhere,
    _count: { _all: true },
    orderBy: { status: "asc" },
  });

  const countStatus = (status: string) =>
    countsByStatus.find((c) => c.status === status)?._count._all ?? 0;

  const activeCandidates = await prisma.affiliation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { not: null },
      renewalStatus: "NOT_STARTED",
      ...activeScopeWhere,
      OR: [
        { lastNotifiedRenewalStartAt: null },
        { lastNotifiedRenewalStartAt: { lt: oneWeekAgo } },
      ],
    },
    include: {
      specialist: { select: { id: true, firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true, renewalLeadMonths: true } },
    },
    orderBy: { expiresAt: "asc" },
    take: 500,
  });

  const renewalRows: RenewalRow[] = activeCandidates
    .map((a) => {
      if (!a.expiresAt) return null;
      const startAt = subMonths(a.expiresAt, a.insurance.renewalLeadMonths);
      if (startAt > now) return null;
      return {
        id: a.id,
        specialistId: a.specialist.id,
        specialistName: `${a.specialist.lastName}, ${a.specialist.firstName}`,
        clinic: `${a.clinic.code} - ${a.clinic.name}`,
        insurance: a.insurance.name,
        startAt,
        expiresAt: a.expiresAt,
      };
    })
    .filter((x): x is RenewalRow => Boolean(x))
    .slice(0, 100);

  const inProgressCandidates = await prisma.affiliation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { not: null },
      renewalStatus: { not: "NOT_STARTED" },
      ...activeScopeWhere,
      OR: [
        { lastNotifiedRenewalEscalationAt: null },
        { lastNotifiedRenewalEscalationAt: { lt: oneWeekAgo } },
      ],
    },
    include: {
      specialist: { select: { id: true, firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true } },
    },
    orderBy: { expiresAt: "asc" },
    take: 500,
  });

  const soonThreshold = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  const inProgressRenewalRows: InProgressRenewalRow[] = inProgressCandidates
    .filter((a) => Boolean(a.expiresAt) && a.expiresAt! <= soonThreshold)
    .map((a) => ({
      id: a.id,
      specialistId: a.specialist.id,
      specialistName: `${a.specialist.lastName}, ${a.specialist.firstName}`,
      clinic: `${a.clinic.code} - ${a.clinic.name}`,
      insurance: a.insurance.name,
      renewalStatus: String(a.renewalStatus),
      expiresAt: a.expiresAt!,
    }))
    .slice(0, 100);

  const activationCandidates = await prisma.affiliation.findMany({
    where: {
      status: { in: ["IN_PROCESS", "NOT_STARTED"] },
      requestedAt: { not: null },
      activatedAt: null,
      ...activeScopeWhere,
      OR: [
        { lastNotifiedActivationAt: null },
        { lastNotifiedActivationAt: { lt: oneWeekAgo } },
      ],
    },
    include: {
      specialist: { select: { id: true, firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true, activationLeadMonths: true } },
    },
    orderBy: { requestedAt: "asc" },
    take: 500,
  });

  const activationRows: ActivationRow[] = activationCandidates
    .map((a) => {
      if (!a.requestedAt) return null;
      const expectedAt = addMonths(a.requestedAt, a.insurance.activationLeadMonths);
      if (expectedAt > now) return null;
      const daysOverdue = Math.max(
        0,
        Math.floor((now.getTime() - expectedAt.getTime()) / (24 * 60 * 60 * 1000))
      );
      return {
        id: a.id,
        specialistId: a.specialist.id,
        specialistName: `${a.specialist.lastName}, ${a.specialist.firstName}`,
        clinic: `${a.clinic.code} - ${a.clinic.name}`,
        insurance: a.insurance.name,
        requestedAt: a.requestedAt,
        expectedAt,
        daysOverdue,
      };
    })
    .filter((x): x is ActivationRow => Boolean(x))
    .slice(0, 100);

  const pendingCandidates = await prisma.affiliation.findMany({
    where: pendingWhere,
    include: {
      specialist: { select: { id: true, firstName: true, lastName: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const pendingRows: PendingRow[] = pendingCandidates.map((a) => ({
    id: a.id,
    status: a.status,
    specialistId: a.specialist.id,
    specialistName: `${a.specialist.lastName}, ${a.specialist.firstName}`,
    clinic: `${a.clinic.code} - ${a.clinic.name}`,
    insurance: a.insurance.name,
    notes: a.notes ?? "",
  }));

  const [pendingByClinic, pendingByInsurance, pendingByClinicInsurance] =
    await Promise.all([
      prisma.affiliation.groupBy({
        by: ["clinicId"],
        where: pendingWhere,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.affiliation.groupBy({
        by: ["insuranceId"],
        where: pendingWhere,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.affiliation.groupBy({
        by: ["clinicId", "insuranceId"],
        where: pendingWhere,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

  const clinicNameById = new Map(
    clinics.map((c) => [c.id, `${c.code} - ${c.name}`] as const)
  );
  const insuranceNameById = new Map(
    insurances.map((i) => [i.id, i.name] as const)
  );

  const cfg = getMailConfig();
  const transporter = createTransport();

  const dateLabel = formatDate(now, timeZone);
  const subject = `Afiliaciones - Reporte semanal (${dateLabel})`;

  const pendingFullLimit = 20000;

  const text = [
    `Reporte semanal (${dateLabel})`,
    "",
    `Especialistas activos: ${specialistsCount}`,
    `Sedes activas: ${clinicsCount}`,
    `Seguros activos: ${insurancesCount}`,
    `Afiliaciones: ${affiliationsCount} (esperadas: ${expectedAffiliationsCount}, faltan: ${missingAffiliationsCount})`,
    "",
    "Adjuntos:",
    `- pendientes_full.csv (hasta ${pendingFullLimit})`,
    "- renovaciones_a_iniciar.csv",
    "- renovaciones_en_curso.csv",
    "- activaciones_demoradas.csv",
    "- faltantes_matriz_muestra.csv",
    missingAffiliationsCount
      ? `Faltantes de matriz (muestra): ${Math.min(missingAffiliationsSample.length, missingAffiliationsCount)}/${missingAffiliationsCount}`
      : null,
    ...missingAffiliationsSample.map(
      (r) => `- FALTA | ${r.specialistName} | ${r.clinic} | ${r.insurance}`
    ),
    "",
    `Por estado:`,
    `- NOT_STARTED: ${countStatus("NOT_STARTED")}`,
    `- IN_PROCESS: ${countStatus("IN_PROCESS")}`,
    `- ACTIVE: ${countStatus("ACTIVE")}`,
    `- REJECTED: ${countStatus("REJECTED")}`,
    `- NOT_POSSIBLE: ${countStatus("NOT_POSSIBLE")}`,
    "",
    `Pendientes NO activas (top ${pendingRows.length}):`,
    ...pendingRows.map(
      (r) =>
        `- ${r.status} | ${r.specialistName} | ${r.clinic} | ${r.insurance}${r.notes ? ` | ${r.notes}` : ""}`
    ),
    "",
    "Pendientes - top sedes:",
    ...pendingByClinic.map(
      (r) => `- ${clinicNameById.get(r.clinicId) ?? r.clinicId}: ${r._count.id}`
    ),
    "",
    "Pendientes - top seguros:",
    ...pendingByInsurance.map(
      (r) => `- ${insuranceNameById.get(r.insuranceId) ?? r.insuranceId}: ${r._count.id}`
    ),
    "",
    "Pendientes - top combinaciones sede+seguro:",
    ...pendingByClinicInsurance.map(
      (r) =>
        `- ${(clinicNameById.get(r.clinicId) ?? r.clinicId)} | ${(insuranceNameById.get(r.insuranceId) ?? r.insuranceId)}: ${r._count.id}`
    ),
    "",
    `Renovaciones a iniciar (top ${renewalRows.length}):`,
    ...renewalRows.map(
      (r) =>
        `- ${r.specialistName} | ${r.clinic} | ${r.insurance} | iniciar: ${formatDate(r.startAt, timeZone)} | vence: ${formatDate(r.expiresAt, timeZone)}`
    ),
    "",
    `Renovaciones en curso (proximas a vencer) (top ${inProgressRenewalRows.length}):`,
    ...inProgressRenewalRows.map(
      (r) =>
        `- ${r.renewalStatus} | ${r.specialistName} | ${r.clinic} | ${r.insurance} | vence: ${formatDate(r.expiresAt, timeZone)}`
    ),
    "",
    `Activaciones demoradas (top ${activationRows.length}):`,
    ...activationRows.map(
      (r) =>
        `- ${r.specialistName} | ${r.clinic} | ${r.insurance} | solicitada: ${formatDate(r.requestedAt, timeZone)} | esperada: ${formatDate(r.expectedAt, timeZone)} | dias: ${r.daysOverdue}`
    ),
  ]
    .filter((x): x is string => typeof x === "string")
    .join("\n");

  const htmlRows = (rows: { cols: string[] }[]) =>
    rows
      .map(
        (r) =>
          `<tr>${r.cols
            .map(
              (c) =>
                `<td style="padding:6px 10px;border-top:1px solid #eee;vertical-align:top">${escapeHtml(c)}</td>`
            )
            .join("")}</tr>`
      )
      .join("");

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; color:#111; line-height:1.4">
    <h2 style="margin:0 0 8px">Reporte semanal</h2>
    <div style="color:#555; margin:0 0 16px">${escapeHtml(dateLabel)} (${escapeHtml(timeZone)})</div>

    <h3 style="margin:16px 0 8px">Estado general</h3>
    <table style="border-collapse:collapse; width:100%; max-width:900px">
      ${htmlRows([
        {
          cols: [
            "Especialistas activos",
            String(specialistsCount),
            "Sedes activas",
            String(clinicsCount),
            "Seguros activos",
            String(insurancesCount),
          ],
        },
        {
          cols: [
            "Afiliaciones",
            String(affiliationsCount),
            "Esperadas",
            String(expectedAffiliationsCount),
            "Faltan",
            String(missingAffiliationsCount),
          ],
        },
      ])}
    </table>

    <h3 style="margin:16px 0 8px">Faltantes de matriz</h3>
    <div style="color:#555; margin:0 0 10px">Muestra (hasta 50): ${missingAffiliationsSample.length} / ${missingAffiliationsCount}</div>
    <table style="border-collapse:collapse; width:100%; max-width:900px">
      <tr>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Especialista</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Sede</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Seguro</th>
      </tr>
      ${htmlRows(
        missingAffiliationsSample.length
          ? missingAffiliationsSample.map((r) => ({
              cols: [r.specialistName, r.clinic, r.insurance],
            }))
          : [{ cols: ["(sin items)", "", ""] }]
      )}
    </table>

    <h3 style="margin:16px 0 8px">Por estado</h3>
    <table style="border-collapse:collapse; width:100%; max-width:600px">
      ${htmlRows([
        { cols: ["NOT_STARTED", String(countStatus("NOT_STARTED"))] },
        { cols: ["IN_PROCESS", String(countStatus("IN_PROCESS"))] },
        { cols: ["ACTIVE", String(countStatus("ACTIVE"))] },
        { cols: ["REJECTED", String(countStatus("REJECTED"))] },
        { cols: ["NOT_POSSIBLE", String(countStatus("NOT_POSSIBLE"))] },
      ])}
    </table>

    <h3 style="margin:16px 0 8px">Pendientes NO activas</h3>
    <table style="border-collapse:collapse; width:100%; max-width:900px">
      <tr>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Estado</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Especialista</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Sede</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Seguro</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Notas</th>
      </tr>
      ${htmlRows(
        pendingRows.length
          ? pendingRows.map((r) => ({
              cols: [r.status, r.specialistName, r.clinic, r.insurance, r.notes],
            }))
          : [{ cols: ["(sin items)", "", "", "", ""] }]
      )}
    </table>

    <h3 style="margin:16px 0 8px">Pendientes - top sedes</h3>
    <table style="border-collapse:collapse; width:100%; max-width:600px">
      ${htmlRows(
        pendingByClinic.length
          ? pendingByClinic.map((r) => ({
              cols: [
                clinicNameById.get(r.clinicId) ?? r.clinicId,
                String(r._count.id),
              ],
            }))
          : [{ cols: ["(sin items)", ""] }]
      )}
    </table>

    <h3 style="margin:16px 0 8px">Pendientes - top seguros</h3>
    <table style="border-collapse:collapse; width:100%; max-width:600px">
      ${htmlRows(
        pendingByInsurance.length
          ? pendingByInsurance.map((r) => ({
              cols: [
                insuranceNameById.get(r.insuranceId) ?? r.insuranceId,
                String(r._count.id),
              ],
            }))
          : [{ cols: ["(sin items)", ""] }]
      )}
    </table>

    <h3 style="margin:16px 0 8px">Pendientes - top combinaciones sede+seguro</h3>
    <table style="border-collapse:collapse; width:100%; max-width:900px">
      ${htmlRows(
        pendingByClinicInsurance.length
          ? pendingByClinicInsurance.map((r) => ({
              cols: [
                clinicNameById.get(r.clinicId) ?? r.clinicId,
                insuranceNameById.get(r.insuranceId) ?? r.insuranceId,
                String(r._count.id),
              ],
            }))
          : [{ cols: ["(sin items)", "", ""] }]
      )}
    </table>

    <h3 style="margin:16px 0 8px">Renovaciones a iniciar</h3>
    <table style="border-collapse:collapse; width:100%; max-width:900px">
      <tr>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Especialista</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Sede</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Seguro</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Iniciar</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Vence</th>
      </tr>
      ${htmlRows(
        renewalRows.length
          ? renewalRows.map((r) => ({
              cols: [
                r.specialistName,
                r.clinic,
                r.insurance,
                formatDate(r.startAt, timeZone),
                formatDate(r.expiresAt, timeZone),
              ],
            }))
          : [{ cols: ["(sin items)", "", "", "", ""] }]
      )}
    </table>

    <h3 style="margin:16px 0 8px">Renovaciones en curso (proximas a vencer)</h3>
    <table style="border-collapse:collapse; width:100%; max-width:900px">
      <tr>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Estado</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Especialista</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Sede</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Seguro</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Vence</th>
      </tr>
      ${htmlRows(
        inProgressRenewalRows.length
          ? inProgressRenewalRows.map((r) => ({
              cols: [
                r.renewalStatus,
                r.specialistName,
                r.clinic,
                r.insurance,
                formatDate(r.expiresAt, timeZone),
              ],
            }))
          : [{ cols: ["(sin items)", "", "", "", ""] }]
      )}
    </table>

    <h3 style="margin:16px 0 8px">Activaciones demoradas</h3>
    <table style="border-collapse:collapse; width:100%; max-width:900px">
      <tr>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Especialista</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Sede</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Seguro</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Solicitada</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Esperada</th>
        <th style="text-align:left;padding:6px 10px;color:#666;font-size:12px">Dias</th>
      </tr>
      ${htmlRows(
        activationRows.length
          ? activationRows.map((r) => ({
              cols: [
                r.specialistName,
                r.clinic,
                r.insurance,
                formatDate(r.requestedAt, timeZone),
                formatDate(r.expectedAt, timeZone),
                String(r.daysOverdue),
              ],
            }))
          : [{ cols: ["(sin items)", "", "", "", "", ""] }]
      )}
    </table>
  </div>
  `.trim();

  const pendingFull = await prisma.affiliation.findMany({
    where: pendingWhere,
    include: {
      specialist: { select: { firstName: true, lastName: true, email: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true, category: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: pendingFullLimit,
  });

  const pendingFullCsv = toCsv(
    [
      "status",
      "specialist_last_name",
      "specialist_first_name",
      "specialist_email",
      "clinic_code",
      "clinic_name",
      "insurance_name",
      "insurance_category",
      "notes",
      "requestedAt",
      "activatedAt",
      "expiresAt",
      "updatedAt",
    ],
    pendingFull.map((a) => [
      a.status,
      a.specialist.lastName,
      a.specialist.firstName,
      a.specialist.email ?? "",
      a.clinic.code,
      a.clinic.name,
      a.insurance.name,
      String(a.insurance.category),
      a.notes ?? "",
      a.requestedAt?.toISOString() ?? "",
      a.activatedAt?.toISOString() ?? "",
      a.expiresAt?.toISOString() ?? "",
      a.updatedAt.toISOString(),
    ])
  );

  const renewalsToStartCsv = toCsv(
    ["specialist", "clinic", "insurance", "startAt", "expiresAt"],
    renewalRows.map((r) => [
      r.specialistName,
      r.clinic,
      r.insurance,
      r.startAt.toISOString(),
      r.expiresAt.toISOString(),
    ])
  );

  const renewalsInProgressCsv = toCsv(
    ["renewalStatus", "specialist", "clinic", "insurance", "expiresAt"],
    inProgressRenewalRows.map((r) => [
      r.renewalStatus,
      r.specialistName,
      r.clinic,
      r.insurance,
      r.expiresAt.toISOString(),
    ])
  );

  const activationDelayedCsv = toCsv(
    ["specialist", "clinic", "insurance", "requestedAt", "expectedAt", "daysOverdue"],
    activationRows.map((r) => [
      r.specialistName,
      r.clinic,
      r.insurance,
      r.requestedAt.toISOString(),
      r.expectedAt.toISOString(),
      r.daysOverdue,
    ])
  );

  const missingMatrixSampleCsv = toCsv(
    ["specialist", "clinic", "insurance"],
    missingAffiliationsSample.map((r) => [r.specialistName, r.clinic, r.insurance])
  );

  await transporter.sendMail({
    from: cfg.from,
    to: cfg.to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: "pendientes_full.csv",
        content: pendingFullCsv,
        contentType: "text/csv; charset=utf-8",
      },
      {
        filename: "renovaciones_a_iniciar.csv",
        content: renewalsToStartCsv,
        contentType: "text/csv; charset=utf-8",
      },
      {
        filename: "renovaciones_en_curso.csv",
        content: renewalsInProgressCsv,
        contentType: "text/csv; charset=utf-8",
      },
      {
        filename: "activaciones_demoradas.csv",
        content: activationDelayedCsv,
        contentType: "text/csv; charset=utf-8",
      },
      {
        filename: "faltantes_matriz_muestra.csv",
        content: missingMatrixSampleCsv,
        contentType: "text/csv; charset=utf-8",
      },
    ],
  });

  if (renewalRows.length) {
    await prisma.affiliation.updateMany({
      where: { id: { in: renewalRows.map((r) => r.id) } },
      data: { lastNotifiedRenewalStartAt: now },
    });
  }

  if (inProgressRenewalRows.length) {
    await prisma.affiliation.updateMany({
      where: { id: { in: inProgressRenewalRows.map((r) => r.id) } },
      data: { lastNotifiedRenewalEscalationAt: now },
    });
  }
  if (activationRows.length) {
    await prisma.affiliation.updateMany({
      where: { id: { in: activationRows.map((r) => r.id) } },
      data: { lastNotifiedActivationAt: now },
    });
  }

  return {
    ok: true,
    sentTo: cfg.to,
    specialistsCount,
    clinicsCount,
    insurancesCount,
    affiliationsCount,
    expectedAffiliationsCount,
    missingAffiliationsCount,
    matrixMissingSampleCount: missingAffiliationsSample.length,
    renewalCount: renewalRows.length,
    inProgressRenewalCount: inProgressRenewalRows.length,
    activationCount: activationRows.length,
    pendingCount: pendingRows.length,
  };
}
