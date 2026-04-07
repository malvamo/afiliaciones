import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "@/lib/db";

function isoCompact(d: Date) {
  return d
    .toISOString()
    .replaceAll(":", "")
    .replaceAll("-", "")
    .replace(".", "_")
    .replace("Z", "Z");
}

(async () => {
  const now = new Date();
  const dir = join(process.cwd(), ".tmp", "backups");
  const filePath = join(dir, `backup_${isoCompact(now)}.json`);

  try {
    await mkdir(dir, { recursive: true });

    const [
      clinics,
      insurances,
      specialists,
      specialistInsurances,
      affiliations,
      specialistDocuments,
      affiliationDocuments,
    ] = await Promise.all([
      prisma.clinic.findMany({ orderBy: { code: "asc" } }),
      prisma.insurance.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
      prisma.specialist.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
      prisma.specialistInsurance.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.affiliation.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.specialistDocument.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.affiliationDocument.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const payload = {
      version: 1,
      createdAt: now.toISOString(),
      counts: {
        clinics: clinics.length,
        insurances: insurances.length,
        specialists: specialists.length,
        specialistInsurances: specialistInsurances.length,
        affiliations: affiliations.length,
        specialistDocuments: specialistDocuments.length,
        affiliationDocuments: affiliationDocuments.length,
      },
      data: {
        clinics,
        insurances,
        specialists,
        specialistInsurances,
        affiliations,
        specialistDocuments,
        affiliationDocuments,
      },
    };

    await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");

    process.stdout.write(`Backup written: ${filePath}\n`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
