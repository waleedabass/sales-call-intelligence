/*
  Warnings:

  - Added the required column `recordingData` to the `Call` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Call" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "recordingPath" TEXT NOT NULL,
    "recordingData" BLOB NOT NULL,
    "durationSec" INTEGER,
    "repName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "transcriptionModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Call_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Call" ("createdAt", "dealId", "durationSec", "id", "occurredAt", "recordingPath", "repName", "source", "status", "title", "transcriptionModel") SELECT "createdAt", "dealId", "durationSec", "id", "occurredAt", "recordingPath", "repName", "source", "status", "title", "transcriptionModel" FROM "Call";
DROP TABLE "Call";
ALTER TABLE "new_Call" RENAME TO "Call";
CREATE INDEX "Call_dealId_idx" ON "Call"("dealId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
