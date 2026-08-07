import type { CrmApplyResult, CrmFieldChangeInput, CrmProvider } from "./types";

export const logOnlyCrmProvider: CrmProvider = {
  name: "log_only",
  async applyFieldChanges(hubspotDealId: string | null, changes: CrmFieldChangeInput[]): Promise<CrmApplyResult> {
    console.log(
      `[CRM disabled — set HUBSPOT_API_KEY] would apply to deal ${hubspotDealId ?? "(unlinked)"}: ${changes
        .map((c) => `${c.fieldName}=${c.value}`)
        .join(", ")}`
    );
    return { provider: "log_only", externalId: null };
  },
};
