import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = safeString(url.searchParams.get("status"));
  const clinicCode = safeString(url.searchParams.get("clinic"));
  const insuranceName = safeString(url.searchParams.get("insurance"));
  const q = safeString(url.searchParams.get("q")).trim();

  const [clinics, insurances] = await Promise.all([
    prisma.clinic.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true },
    }),
    prisma.insurance.findMany({
      where: { active: true },
      select: { id: true, name: true },
    }),
  ]);

  const clinicId = clinics.find((c) => c.code === clinicCode)?.id ?? null;
  const insuranceId =
    insurances.find((i) => i.name === insuranceName)?.id ?? null;

  const allowedStatuses = new Set([
    "NOT_STARTED",
    "IN_PROCESS",
    "REJECTED",
    "NOT_POSSIBLE",
  ]);
  const statusFilter = allowedStatuses.has(status) ? status : null;

  const where = {
    status: statusFilter ? statusFilter : { in: Array.from(allowedStatuses) },
    specialist: { active: true },
    clinic: { active: true },
    insurance: { active: true },
    ...(clinicId ? { clinicId } : {}),
    ...(insuranceId ? { insuranceId } : {}),
    ...(q
      ? {
          specialist: {
            active: true,
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
            ],
          },
        }
      : {}),
  } satisfies Prisma.AffiliationWhereInput;

  const rows = await prisma.affiliation.findMany({
    where,
    include: {
      specialist: { select: { firstName: true, lastName: true, email: true } },
      clinic: { select: { code: true, name: true } },
      insurance: { select: { name: true, category: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 5000,
  });

  const header = [
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
  ].join(",");

  const lines = rows.map((a) =>
    [
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
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [header, ...lines].join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=pending-affiliations.csv",
    },
  });
}
