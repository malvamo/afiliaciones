"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { InsuranceCategory } from "@prisma/client";
import {
  ensureAffiliationsForInsurance,
  ensureSpecialistInsuranceRows,
} from "@/lib/matrix";

export async function createInsurance(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder"));

  if (!name) throw new Error("Missing name");
  const allowed = new Set(["MEDICAID", "PPO"]);
  if (!allowed.has(category)) throw new Error("Invalid category");

  const safeInt = (n: number) =>
    Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;

  const insurance = await prisma.insurance.create({
    data: {
      name,
      category: category as InsuranceCategory,
      sortOrder: safeInt(sortOrder),
      termMonths: 12,
      renewalLeadMonths: 3,
      activationLeadMonths: 3,
      active: true,
    },
    select: { id: true },
  });


  const [specialists, clinics] = await Promise.all([
    prisma.specialist.findMany({ where: { active: true }, select: { id: true } }),
    prisma.clinic.findMany({ where: { active: true }, select: { id: true } }),
  ]);

  for (const s of specialists) {
    await ensureSpecialistInsuranceRows({
      specialistId: s.id,
      insuranceIds: [insurance.id],
    });
  }

  await ensureAffiliationsForInsurance({
    insuranceId: insurance.id,
    specialistIds: specialists.map((s) => s.id),
    clinicIds: clinics.map((c) => c.id),
  });

  redirect(`/seguros/${insurance.id}`);
}

export async function updateInsurance(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing insurance id");

  const termMonths = Number(formData.get("termMonths"));
  const renewalLeadMonths = Number(formData.get("renewalLeadMonths"));
  const activationLeadMonths = Number(formData.get("activationLeadMonths"));
  const sortOrder = Number(formData.get("sortOrder"));
  const active = String(formData.get("active") ?? "") === "on";

  const safeInt = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);

  await prisma.insurance.update({
    where: { id },
    data: {
      termMonths: safeInt(termMonths) || 12,
      renewalLeadMonths: safeInt(renewalLeadMonths),
      activationLeadMonths: safeInt(activationLeadMonths),
      sortOrder: safeInt(sortOrder),
      active,
    },
  });


  redirect("/seguros");
}
