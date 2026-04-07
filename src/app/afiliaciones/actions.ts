"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DocumentStorageType } from "@prisma/client";
import { joinRelativePath, sanitizeFilename, saveUploadedFile } from "@/lib/storage";

export async function addAffiliationDocument(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const originalName = String(formData.get("originalName") ?? "").trim() || url;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!affiliationId) throw new Error("Missing affiliationId");
  if (!url) throw new Error("Missing url");

  await prisma.affiliationDocument.create({
    data: {
      affiliationId,
      originalName,
      storedPath: url,
      description,
      mimeType: null,
      storageType: DocumentStorageType.URL,
    },
  });


  redirect(`/afiliaciones/${affiliationId}`);
}

export async function deleteAffiliationDocument(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!affiliationId || !documentId) throw new Error("Missing ids");

  await prisma.affiliationDocument.delete({ where: { id: documentId } });

  redirect(`/afiliaciones/${affiliationId}`);
}

export async function uploadAffiliationDocumentFile(formData: FormData) {
  const affiliationId = String(formData.get("affiliationId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const file = formData.get("file");

  if (!affiliationId) throw new Error("Missing affiliationId");
  if (!file || !(file instanceof File)) throw new Error("Missing file");
  if (file.size === 0) throw new Error("Empty file");

  const created = await prisma.affiliationDocument.create({
    data: {
      affiliationId,
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
      "affiliation",
      `${created.id}_${safeName}`
    );
    const bytes = new Uint8Array(await file.arrayBuffer());
    await saveUploadedFile({ relativePath, bytes });
    await prisma.affiliationDocument.update({
      where: { id: created.id },
      data: { storedPath: relativePath },
    });

  } catch (e) {
    await prisma.affiliationDocument.delete({ where: { id: created.id } });
    throw e;
  }

  redirect(`/afiliaciones/${affiliationId}`);
}
