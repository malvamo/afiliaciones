-- AlterTable
ALTER TABLE "Affiliation" ADD COLUMN "lastNotifiedRenewalEscalationAt" DATETIME;
ALTER TABLE "Affiliation" ADD COLUMN "lastNotifiedRenewalStartAt" DATETIME;

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT,
    "data" JSONB
);

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");
