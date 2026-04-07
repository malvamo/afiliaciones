-- CreateTable
CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ranAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER,
    "error" TEXT
);

-- CreateIndex
CREATE INDEX "CronRun_name_ranAt_idx" ON "CronRun"("name", "ranAt");
