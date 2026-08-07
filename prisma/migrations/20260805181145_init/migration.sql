-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'discovery',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "hubspotDealId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riskScore" INTEGER,
    "riskLabel" TEXT,
    "riskExplanation" TEXT,
    "riskUpdatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "recordingPath" TEXT NOT NULL,
    "durationSec" INTEGER,
    "repName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "transcriptionModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Call_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "startSec" REAL NOT NULL,
    "endSec" REAL NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" TEXT,
    "order" INTEGER NOT NULL,
    CONSTRAINT "TranscriptSegment_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "talkRatioRep" INTEGER,
    "model" TEXT NOT NULL,
    CONSTRAINT "CallInsight_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Objection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "segmentId" TEXT,
    "text" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Objection_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Objection_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TranscriptSegment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "segmentId" TEXT,
    "text" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    CONSTRAINT "Commitment_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Commitment_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TranscriptSegment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitorMention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "segmentId" TEXT,
    "competitorName" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    CONSTRAINT "CompetitorMention_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompetitorMention_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TranscriptSegment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NextStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "segmentId" TEXT,
    "text" TEXT NOT NULL,
    CONSTRAINT "NextStep_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NextStep_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TranscriptSegment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachingNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "repName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "insight" TEXT NOT NULL,
    CONSTRAINT "CoachingNote_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "callId" TEXT,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskFactor_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RiskFactor_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrmFieldChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "evidenceSegmentId" TEXT,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "provider" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmFieldChange_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrmFieldChange_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "callId" TEXT NOT NULL,
    "commitmentId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowUpDraft_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FollowUpDraft_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "Commitment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Deal_riskScore_idx" ON "Deal"("riskScore");

-- CreateIndex
CREATE INDEX "Call_dealId_idx" ON "Call"("dealId");

-- CreateIndex
CREATE INDEX "TranscriptSegment_callId_idx" ON "TranscriptSegment"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "CallInsight_callId_key" ON "CallInsight"("callId");

-- CreateIndex
CREATE INDEX "Objection_callId_idx" ON "Objection"("callId");

-- CreateIndex
CREATE INDEX "Commitment_callId_idx" ON "Commitment"("callId");

-- CreateIndex
CREATE INDEX "CompetitorMention_callId_idx" ON "CompetitorMention"("callId");

-- CreateIndex
CREATE INDEX "NextStep_callId_idx" ON "NextStep"("callId");

-- CreateIndex
CREATE INDEX "CoachingNote_callId_idx" ON "CoachingNote"("callId");

-- CreateIndex
CREATE INDEX "CoachingNote_repName_idx" ON "CoachingNote"("repName");

-- CreateIndex
CREATE INDEX "RiskFactor_dealId_idx" ON "RiskFactor"("dealId");

-- CreateIndex
CREATE INDEX "CrmFieldChange_dealId_idx" ON "CrmFieldChange"("dealId");

-- CreateIndex
CREATE INDEX "CrmFieldChange_callId_idx" ON "CrmFieldChange"("callId");

-- CreateIndex
CREATE INDEX "FollowUpDraft_callId_idx" ON "FollowUpDraft"("callId");
