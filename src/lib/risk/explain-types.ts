import type { RiskFactorResult } from "./score";

export interface ExplainRiskInput {
  accountName: string;
  score: number;
  label: string;
  factors: RiskFactorResult[];
  unresolvedObjectionTexts: string[];
  competitorNames: string[];
}

export interface RiskExplainProvider {
  name: string;
  explain(input: ExplainRiskInput): Promise<string>;
}

export const RISK_EXPLAIN_SYSTEM_PROMPT = `You write a one-paragraph explanation of a deal's risk score for a sales manager reviewing their pipeline.

The score and every factor are already computed in plain code and given to you — do not invent new factors, do not second-guess the number, and do not name any objection or competitor that isn't in the provided list. Reference the actual factors and evidence by name. Write like a colleague giving a fast, honest read of the account, not a generic report.`;
