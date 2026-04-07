import { prisma } from "@/lib/db";
import {
  ensureAffiliationsForSpecialist,
  ensureSpecialistInsuranceRows,
} from "@/lib/matrix";

export type MatrixSyncResult = {
  ok: true;
  specialists: number;
  clinics: number;
  insurances: number;
  expectedAffiliations: number;
  affiliationsBefore: number;
  affiliationsAfter: number;
  expectedSpecialistInsurances: number;
  specialistInsurancesBefore: number;
  specialistInsurancesAfter: number;
};

export async function syncActiveMatrix(): Promise<MatrixSyncResult> {
  const [specialists, clinics, insurances] = await Promise.all([
    prisma.specialist.findMany({ where: { active: true }, select: { id: true } }),
    prisma.clinic.findMany({ where: { active: true }, select: { id: true } }),
    prisma.insurance.findMany({ where: { active: true }, select: { id: true } }),
  ]);

  const specialistIds = specialists.map((s) => s.id);
  const clinicIds = clinics.map((c) => c.id);
  const insuranceIds = insurances.map((i) => i.id);

  const expectedAffiliations =
    specialistIds.length * clinicIds.length * insuranceIds.length;
  const expectedSpecialistInsurances = specialistIds.length * insuranceIds.length;

  const [affiliationsBefore, specialistInsurancesBefore] = await Promise.all([
    prisma.affiliation.count({
      where: {
        specialistId: { in: specialistIds },
        clinicId: { in: clinicIds },
        insuranceId: { in: insuranceIds },
      },
    }),
    prisma.specialistInsurance.count({
      where: {
        specialistId: { in: specialistIds },
        insuranceId: { in: insuranceIds },
      },
    }),
  ]);

  for (const s of specialistIds) {
    await ensureSpecialistInsuranceRows({ specialistId: s, insuranceIds });
    await ensureAffiliationsForSpecialist({ specialistId: s, clinicIds, insuranceIds });
  }

  const [affiliationsAfter, specialistInsurancesAfter] = await Promise.all([
    prisma.affiliation.count({
      where: {
        specialistId: { in: specialistIds },
        clinicId: { in: clinicIds },
        insuranceId: { in: insuranceIds },
      },
    }),
    prisma.specialistInsurance.count({
      where: {
        specialistId: { in: specialistIds },
        insuranceId: { in: insuranceIds },
      },
    }),
  ]);

  return {
    ok: true,
    specialists: specialistIds.length,
    clinics: clinicIds.length,
    insurances: insuranceIds.length,
    expectedAffiliations,
    affiliationsBefore,
    affiliationsAfter,
    expectedSpecialistInsurances,
    specialistInsurancesBefore,
    specialistInsurancesAfter,
  };
}
