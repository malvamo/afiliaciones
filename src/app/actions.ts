"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureAffiliationsForSpecialist, ensureSpecialistInsuranceRows } from "@/lib/matrix";

export async function syncAffiliationsMatrix() {
  const [specialists, clinics, insurances] = await Promise.all([
    prisma.specialist.findMany({ where: { active: true }, select: { id: true } }),
    prisma.clinic.findMany({ where: { active: true }, select: { id: true } }),
    prisma.insurance.findMany({ where: { active: true }, select: { id: true } }),
  ]);

  const clinicIds = clinics.map((c) => c.id);
  const insuranceIds = insurances.map((i) => i.id);

  for (const s of specialists) {
    await ensureSpecialistInsuranceRows({
      specialistId: s.id,
      insuranceIds,
    });
    await ensureAffiliationsForSpecialist({
      specialistId: s.id,
      clinicIds,
      insuranceIds,
    });
  }

  redirect("/");
}
