-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Insurance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "termMonths" INTEGER NOT NULL DEFAULT 12,
    "renewalLeadMonths" INTEGER NOT NULL DEFAULT 3,
    "activationLeadMonths" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Specialist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SpecialistDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specialistId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecialistDocument_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Affiliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specialistId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "insuranceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "requestedAt" DATETIME,
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "lastNotifiedRenewalAt" DATETIME,
    "lastNotifiedActivationAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Affiliation_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Affiliation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Affiliation_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "Insurance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AffiliationDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "affiliationId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliationDocument_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "Affiliation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_code_key" ON "Clinic"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Insurance_name_key" ON "Insurance"("name");

-- CreateIndex
CREATE INDEX "Insurance_category_sortOrder_idx" ON "Insurance"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "Specialist_lastName_firstName_idx" ON "Specialist"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "SpecialistDocument_specialistId_createdAt_idx" ON "SpecialistDocument"("specialistId", "createdAt");

-- CreateIndex
CREATE INDEX "Affiliation_clinicId_insuranceId_idx" ON "Affiliation"("clinicId", "insuranceId");

-- CreateIndex
CREATE INDEX "Affiliation_insuranceId_status_idx" ON "Affiliation"("insuranceId", "status");

-- CreateIndex
CREATE INDEX "Affiliation_status_expiresAt_idx" ON "Affiliation"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliation_specialistId_clinicId_insuranceId_key" ON "Affiliation"("specialistId", "clinicId", "insuranceId");

-- CreateIndex
CREATE INDEX "AffiliationDocument_affiliationId_createdAt_idx" ON "AffiliationDocument"("affiliationId", "createdAt");
