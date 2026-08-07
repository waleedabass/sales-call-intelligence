export interface RiskFactorResult {
  label: string;
  points: number;
}

export interface RiskScoreInput {
  unresolvedObjectionCount: number;
  overdueCommitmentCount: number;
  competitorMentionCount: number;
  daysSinceLastCall: number | null; // null if no calls yet
  callCount: number;
  stageIsEarly: boolean; // discovery/technical_evaluation
}

export interface RiskScoreResult {
  score: number; // 0-100, higher = riskier
  label: "low" | "medium" | "high";
  factors: RiskFactorResult[];
}

// Deterministic, in plain code — same reasoning as lead-qualification's
// computeScore: the brief contrasts agency systems that "detect risk...
// preserve evidence" against average tools that just summarize, and an
// AI-guessed risk number would be neither reproducible nor explainable the
// way a labeled point breakdown is. Higher score = higher risk (inverse of
// lead-qualification's intent score, where higher = better).
export function computeRisk(input: RiskScoreInput): RiskScoreResult {
  const factors: RiskFactorResult[] = [];

  const objectionPoints = Math.min(input.unresolvedObjectionCount * 15, 45);
  if (input.unresolvedObjectionCount > 0) {
    factors.push({
      label: `${input.unresolvedObjectionCount} unresolved objection${input.unresolvedObjectionCount === 1 ? "" : "s"} across all calls`,
      points: objectionPoints,
    });
  }

  const overduePoints = Math.min(input.overdueCommitmentCount * 20, 40);
  if (input.overdueCommitmentCount > 0) {
    factors.push({
      label: `${input.overdueCommitmentCount} commitment${input.overdueCommitmentCount === 1 ? "" : "s"} past its due date and still open`,
      points: overduePoints,
    });
  }

  const competitorPoints = Math.min(input.competitorMentionCount * 10, 30);
  if (input.competitorMentionCount > 0) {
    factors.push({
      label: `${input.competitorMentionCount} competitor mention${input.competitorMentionCount === 1 ? "" : "s"} across all calls`,
      points: competitorPoints,
    });
  }

  if (input.daysSinceLastCall !== null && input.daysSinceLastCall > 14) {
    factors.push({ label: `${input.daysSinceLastCall} days since the last call — deal going cold`, points: 15 });
  }

  if (input.stageIsEarly && input.callCount >= 3) {
    factors.push({ label: `Still in an early stage after ${input.callCount} calls — stalled progression`, points: 10 });
  }

  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));
  const label = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  return { score, label, factors };
}
