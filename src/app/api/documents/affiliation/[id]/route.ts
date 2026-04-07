import { prisma } from "@/lib/db";
import { loadUploadedFile } from "@/lib/storage";
import { DocumentStorageType } from "@prisma/client";

export const runtime = "nodejs";

function contentDispositionFilename(name: string): string {
  const safe = name.replaceAll(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120);
  return `attachment; filename="${safe || "document"}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const doc = await prisma.affiliationDocument.findUnique({ where: { id } });
  if (!doc) return new Response("Not found", { status: 404 });

  if (doc.storageType === DocumentStorageType.URL) {
    return Response.redirect(doc.storedPath, 302);
  }

  const bytes = await loadUploadedFile(doc.storedPath);
  return new Response(bytes, {
    headers: {
      "content-type": doc.mimeType || "application/octet-stream",
      "content-disposition": contentDispositionFilename(doc.originalName),
    },
  });
}
