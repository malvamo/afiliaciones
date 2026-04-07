import { prisma } from "@/lib/db";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function ensureSpecialistInsuranceRows(params: {
  specialistId: string;
  insuranceIds: string[];
}) {
  const existing = await prisma.specialistInsurance.findMany({
    where: { specialistId: params.specialistId },
    select: { insuranceId: true },
  });

  const existingSet = new Set(existing.map((e) => e.insuranceId));
  const missing = params.insuranceIds
    .filter((id) => !existingSet.has(id))
    .map((insuranceId) => ({ specialistId: params.specialistId, insuranceId }));

  if (!missing.length) return;

  for (const batch of chunk(missing, 500)) {
    await prisma.specialistInsurance.createMany({ data: batch });
  }
}

export async function ensureAffiliationsForSpecialist(params: {
  specialistId: string;
  clinicIds: string[];
  insuranceIds: string[];
}) {
  const existing = await prisma.affiliation.findMany({
    where: { specialistId: params.specialistId },
    select: { clinicId: true, insuranceId: true },
  });

  const existingSet = new Set(
    existing.map((e) => `${e.clinicId}:${e.insuranceId}`)
  );

  const missing: { specialistId: string; clinicId: string; insuranceId: string; status: "NOT_STARTED" }[] = [];
  for (const clinicId of params.clinicIds) {
    for (const insuranceId of params.insuranceIds) {
      const key = `${clinicId}:${insuranceId}`;
      if (existingSet.has(key)) continue;
      missing.push({
        specialistId: params.specialistId,
        clinicId,
        insuranceId,
        status: "NOT_STARTED",
      });
    }
  }

  if (!missing.length) return;

  for (const batch of chunk(missing, 500)) {
    await prisma.affiliation.createMany({ data: batch });
  }
}

export async function ensureAffiliationsForClinic(params: {
  clinicId: string;
  specialistIds: string[];
  insuranceIds: string[];
}) {
  const existing = await prisma.affiliation.findMany({
    where: { clinicId: params.clinicId },
    select: { specialistId: true, insuranceId: true },
  });

  const existingSet = new Set(
    existing.map((e) => `${e.specialistId}:${e.insuranceId}`)
  );

  const missing: { specialistId: string; clinicId: string; insuranceId: string; status: "NOT_STARTED" }[] = [];
  for (const specialistId of params.specialistIds) {
    for (const insuranceId of params.insuranceIds) {
      const key = `${specialistId}:${insuranceId}`;
      if (existingSet.has(key)) continue;
      missing.push({
        specialistId,
        clinicId: params.clinicId,
        insuranceId,
        status: "NOT_STARTED",
      });
    }
  }

  if (!missing.length) return;

  for (const batch of chunk(missing, 500)) {
    await prisma.affiliation.createMany({ data: batch });
  }
}

export async function ensureAffiliationsForInsurance(params: {
  insuranceId: string;
  specialistIds: string[];
  clinicIds: string[];
}) {
  const existing = await prisma.affiliation.findMany({
    where: { insuranceId: params.insuranceId },
    select: { specialistId: true, clinicId: true },
  });

  const existingSet = new Set(
    existing.map((e) => `${e.specialistId}:${e.clinicId}`)
  );

  const missing: { specialistId: string; clinicId: string; insuranceId: string; status: "NOT_STARTED" }[] = [];
  for (const specialistId of params.specialistIds) {
    for (const clinicId of params.clinicIds) {
      const key = `${specialistId}:${clinicId}`;
      if (existingSet.has(key)) continue;
      missing.push({
        specialistId,
        clinicId,
        insuranceId: params.insuranceId,
        status: "NOT_STARTED",
      });
    }
  }

  if (!missing.length) return;

  for (const batch of chunk(missing, 500)) {
    await prisma.affiliation.createMany({ data: batch });
  }
}
