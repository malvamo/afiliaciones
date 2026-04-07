"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureAffiliationsForClinic } from "@/lib/matrix";

export async function createClinic(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) throw new Error("Missing code/name");

  const clinic = await prisma.clinic.create({
    data: { code, name, active: true },
    select: { id: true },
  });


  const [specialists, insurances] = await Promise.all([
    prisma.specialist.findMany({ where: { active: true }, select: { id: true } }),
    prisma.insurance.findMany({ where: { active: true }, select: { id: true } }),
  ]);

  await ensureAffiliationsForClinic({
    clinicId: clinic.id,
    specialistIds: specialists.map((s) => s.id),
    insuranceIds: insurances.map((i) => i.id),
  });

  redirect("/sedes");
}

export async function updateClinic(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "on";
  if (!id || !code || !name) throw new Error("Missing fields");

  const clinic = await prisma.clinic.update({
    where: { id },
    data: { code, name, active },
    select: { id: true, active: true },
  });


  if (clinic.active) {
    const [specialists, insurances] = await Promise.all([
      prisma.specialist.findMany({ where: { active: true }, select: { id: true } }),
      prisma.insurance.findMany({ where: { active: true }, select: { id: true } }),
    ]);

    await ensureAffiliationsForClinic({
      clinicId: clinic.id,
      specialistIds: specialists.map((s) => s.id),
      insuranceIds: insurances.map((i) => i.id),
    });
  }

  redirect("/sedes");
}
