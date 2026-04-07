-- CreateTable
CREATE TABLE "SpecialistInsurance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specialistId" TEXT NOT NULL,
    "insuranceId" TEXT NOT NULL,
    "firstRequestedAt" DATETIME,
    "firstActivatedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SpecialistInsurance_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpecialistInsurance_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "Insurance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Affiliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specialistId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "insuranceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "requestedAt" DATETIME,
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "renewalStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "renewalStartedAt" DATETIME,
    "renewalNotes" TEXT,
    "lastNotifiedRenewalAt" DATETIME,
    "lastNotifiedActivationAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Affiliation_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Affiliation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Affiliation_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "Insurance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Affiliation" ("activatedAt", "clinicId", "createdAt", "expiresAt", "id", "insuranceId", "lastNotifiedActivationAt", "lastNotifiedRenewalAt", "notes", "requestedAt", "specialistId", "status", "updatedAt") SELECT "activatedAt", "clinicId", "createdAt", "expiresAt", "id", "insuranceId", "lastNotifiedActivationAt", "lastNotifiedRenewalAt", "notes", "requestedAt", "specialistId", "status", "updatedAt" FROM "Affiliation";
DROP TABLE "Affiliation";
ALTER TABLE "new_Affiliation" RENAME TO "Affiliation";
CREATE INDEX "Affiliation_clinicId_insuranceId_idx" ON "Affiliation"("clinicId", "insuranceId");
CREATE INDEX "Affiliation_insuranceId_status_idx" ON "Affiliation"("insuranceId", "status");
CREATE INDEX "Affiliation_status_expiresAt_idx" ON "Affiliation"("status", "expiresAt");
CREATE UNIQUE INDEX "Affiliation_specialistId_clinicId_insuranceId_key" ON "Affiliation"("specialistId", "clinicId", "insuranceId");
CREATE TABLE "new_AffiliationDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "affiliationId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "storageType" TEXT NOT NULL DEFAULT 'URL',
    "mimeType" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliationDocument_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "Affiliation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AffiliationDocument" ("affiliationId", "createdAt", "description", "id", "mimeType", "originalName", "storedPath") SELECT "affiliationId", "createdAt", "description", "id", "mimeType", "originalName", "storedPath" FROM "AffiliationDocument";
DROP TABLE "AffiliationDocument";
ALTER TABLE "new_AffiliationDocument" RENAME TO "AffiliationDocument";
CREATE INDEX "AffiliationDocument_affiliationId_createdAt_idx" ON "AffiliationDocument"("affiliationId", "createdAt");
CREATE TABLE "new_SpecialistDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specialistId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "storageType" TEXT NOT NULL DEFAULT 'URL',
    "mimeType" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecialistDocument_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SpecialistDocument" ("createdAt", "description", "id", "mimeType", "originalName", "specialistId", "storedPath") SELECT "createdAt", "description", "id", "mimeType", "originalName", "specialistId", "storedPath" FROM "SpecialistDocument";
DROP TABLE "SpecialistDocument";
ALTER TABLE "new_SpecialistDocument" RENAME TO "SpecialistDocument";
CREATE INDEX "SpecialistDocument_specialistId_createdAt_idx" ON "SpecialistDocument"("specialistId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SpecialistInsurance_insuranceId_idx" ON "SpecialistInsurance"("insuranceId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialistInsurance_specialistId_insuranceId_key" ON "SpecialistInsurance"("specialistId", "insuranceId");
