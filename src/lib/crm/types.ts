export interface CrmFieldChangeInput {
  fieldName: string;
  value: string;
}

export interface CrmApplyResult {
  provider: string;
  externalId: string | null;
}

export interface CrmProvider {
  name: string;
  // hubspotDealId is null for a deal never linked to a real CRM record —
  // providers should fall back to log-only behavior themselves in that
  // case rather than erroring, same as the other ARC projects' log-only
  // defaults when no key is configured.
  applyFieldChanges(hubspotDealId: string | null, changes: CrmFieldChangeInput[]): Promise<CrmApplyResult>;
}
