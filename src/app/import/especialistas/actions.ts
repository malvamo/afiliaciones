"use server";

import "dotenv/config";

import Papa from "papaparse";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureAffiliationsForSpecialist, ensureSpecialistInsuranceRows } from "@/lib/matrix";

type CsvRow = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export async function importSpecialistsCsv(formData: FormData) {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) throw new Error("Missing file");
  if (file.size === 0) throw new Error("Empty file");

  const text = new TextDecoder().decode(await file.arrayBuffer());
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length) {
    throw new Error(`CSV parse error: ${parsed.errors[0]?.message ?? "unknown"}`);
  }

  const rows = (parsed.data ?? [])
    .map((r) => ({
      firstName: String(r.firstName ?? "").trim(),
      lastName: String(r.lastName ?? "").trim(),
      email: String(r.email ?? "").trim() || null,
      phone: String(r.phone ?? "").trim() || null,
      notes: String(r.notes ?? "").trim() || null,
    }))
    .filter((r) => r.firstName && r.lastName);

  const [clinics, insurances] = await Promise.all([
    prisma.clinic.findMany({ where: { active: true }, select: { id: true } }),
    prisma.insurance.findMany({ where: { active: true }, select: { id: true } }),
  ]);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of rows) {
    try {
      if (r.email) {
        const exists = await prisma.specialist.findFirst({
          where: { email: r.email },
          select: { id: true },
        });
        if (exists) {
          skipped += 1;
          continue;
        }
      }

      const specialist = await prisma.specialist.create({
        data: {
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          phone: r.phone,
          notes: r.notes,
          active: true,
        },
        select: { id: true },
      });

      await ensureSpecialistInsuranceRows({
        specialistId: specialist.id,
        insuranceIds: insurances.map((i) => i.id),
      });
      await ensureAffiliationsForSpecialist({
        specialistId: specialist.id,
        clinicIds: clinics.map((c) => c.id),
        insuranceIds: insurances.map((i) => i.id),
      });
      created += 1;
    } catch {
      errors += 1;
    }
  }

  redirect(`/especialistas?import=ok&created=${created}&skipped=${skipped}&errors=${errors}`);
}
