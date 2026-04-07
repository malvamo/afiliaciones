"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { addMonths, parseDateInputValue } from "@/lib/dates";
import { AffiliationStatus, DocumentStorageType } from "@prisma/client";
import { joinRelativePath, sanitizeFilename, saveUploadedFile } from "@/lib/storage";
import { ensureAffiliationsForSpecialist, ensureSpecialistInsuranceRows } from "@/lib/matrix";

export async function createSpecialist(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if ((status === "REJECTED" || status === "NOT_POSSIBLE") && !notes) {
    throw new Error("Notas requeridas para REJECTED / NOT_POSSIBLE");
  }

  if (!firstName || !lastName) {
    throw new Error("firstName and lastName are required");
  }

  const specialist = await prisma.specialist.create({
    data: { firstName, lastName, email, phone, notes, active: true },
    select: { id: true },
  });


  const [clinics, insurances] = await Promise.all([
    prisma.clinic.findMany({ where: { active: true }, select: { id: true } }),
    prisma.insurance.findMany({ where: { active: true }, select: { id: true } }),
  ]);

  await ensureSpecialistInsuranceRows({
    specialistId: specialist.id,
    insuranceIds: insurances.map((i) => i.id),
  });
  await ensureAffiliationsForSpecialist({
    specialistId: specialist.id,
    clinicIds: clinics.map((c) => c.id),
    insuranceIds: insurances.map((i) => i.id),
  });

  redirect(`/especialistas/${specialist.id}`);
}

export async function updateAffiliation(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "").trim();
  const specialistId = String(formData.get("specialistId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!affiliationId || !specialistId) throw new Error("Missing ids");

  const allowedStatuses = new Set([
    "NOT_STARTED",
    "IN_PROCESS",
    "ACTIVE",
    "REJECTED",
    "NOT_POSSIBLE",
  ]);
  if (!allowedStatuses.has(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const requestedAt = parseDateInputValue(String(formData.get("requestedAt") ?? ""));
  const activatedAt = parseDateInputValue(String(formData.get("activatedAt") ?? ""));
  const expiresAt = parseDateInputValue(String(formData.get("expiresAt") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (requestedAt && activatedAt && activatedAt < requestedAt) {
    throw new Error("activatedAt cannot be before requestedAt");
  }
  if (activatedAt && expiresAt && expiresAt < activatedAt) {
    throw new Error("expiresAt cannot be before activatedAt");
  }

  let computedExpiresAt: Date | null = expiresAt;
  if (status === "ACTIVE" && activatedAt && !expiresAt) {
    const row = await prisma.affiliation.findUnique({
      where: { id: affiliationId },
      include: { insurance: { select: { termMonths: true } } },
    });
    if (!row) throw new Error("Affiliation not found");
    computedExpiresAt = addMonths(activatedAt, row.insurance.termMonths);
  }

  await prisma.affiliation.update({
    where: { id: affiliationId },
    data: {
      status: status as AffiliationStatus,
      requestedAt,
      activatedAt,
      expiresAt: computedExpiresAt,
      notes,
    },
  });


  redirect(`/especialistas/${specialistId}`);
}

export async function updateSpecialist(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing specialist id");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const active = String(formData.get("active") ?? "") === "on";

  if (!firstName || !lastName) throw new Error("firstName and lastName are required");

  await prisma.specialist.update({
    where: { id },
    data: { firstName, lastName, email, phone, notes, active },
  });


  redirect(`/especialistas/${id}`);
}

export async function deactivateSpecialist(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing specialist id");
  await prisma.specialist.update({ where: { id }, data: { active: false } });

  redirect(`/especialistas/${id}`);
}

export async function deleteSpecialist(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!id) throw new Error("Missing specialist id");
  if (confirm !== "DELETE") throw new Error("Type DELETE to confirm");

  await prisma.specialist.delete({ where: { id } });

  redirect("/especialistas");
}

export async function addSpecialistDocument(formData: FormData) {
  const specialistId = String(formData.get("specialistId") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const originalName = String(formData.get("originalName") ?? "").trim() || url;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!specialistId) throw new Error("Missing specialistId");
  if (!url) throw new Error("Missing url");

  await prisma.specialistDocument.create({
    data: {
      specialistId,
      originalName,
      storedPath: url,
      description,
      mimeType: null,
      storageType: DocumentStorageType.URL,
    },
  });


  redirect(`/especialistas/${specialistId}`);
}

export async function uploadSpecialistDocumentFile(formData: FormData) {
  const specialistId = String(formData.get("specialistId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const file = formData.get("file");

  if (!specialistId) throw new Error("Missing specialistId");
  if (!file || !(file instanceof File)) throw new Error("Missing file");
  if (file.size === 0) throw new Error("Empty file");

  const created = await prisma.specialistDocument.create({
    data: {
      specialistId,
      originalName: file.name,
      storedPath: "",
      storageType: DocumentStorageType.FILE,
      mimeType: file.type || null,
      description,
    },
    select: { id: true },
  });

  try {
    const safeName = sanitizeFilename(file.name || "document");
    const relativePath = joinRelativePath(
      "specialist",
      `${created.id}_${safeName}`
    );
    const bytes = new Uint8Array(await file.arrayBuffer());
    await saveUploadedFile({ relativePath, bytes });
    await prisma.specialistDocument.update({
      where: { id: created.id },
      data: { storedPath: relativePath },
    });

  } catch (e) {
    await prisma.specialistDocument.delete({ where: { id: created.id } });
    throw e;
  }

  redirect(`/especialistas/${specialistId}`);
}

export async function deleteSpecialistDocument(formData: FormData) {
  const specialistId = String(formData.get("specialistId") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!specialistId || !documentId) throw new Error("Missing ids");

  await prisma.specialistDocument.delete({ where: { id: documentId } });

  redirect(`/especialistas/${specialistId}`);
}

export async function updateSpecialistInsurance(formData: FormData) {
  const specialistId = String(formData.get("specialistId") ?? "").trim();
  const specialistInsuranceId = String(
    formData.get("specialistInsuranceId") ?? ""
  ).trim();
  if (!specialistId || !specialistInsuranceId) throw new Error("Missing ids");

  const firstRequestedAt = parseDateInputValue(
    String(formData.get("firstRequestedAt") ?? "")
  );
  const firstActivatedAt = parseDateInputValue(
    String(formData.get("firstActivatedAt") ?? "")
  );
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.specialistInsurance.update({
    where: { id: specialistInsuranceId },
    data: { firstRequestedAt, firstActivatedAt, notes },
  });


  redirect(`/especialistas/${specialistId}`);
}
