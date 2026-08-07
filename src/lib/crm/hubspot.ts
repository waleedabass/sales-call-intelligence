import type { CrmApplyResult, CrmFieldChangeInput, CrmProvider } from "./types";

// HubSpot CRM v3 Deals API — same stable integration proven in the other
// three ARC projects' contact sync, applied to deal properties instead.
// Deals don't have a natural unique key like a contact's email, so unlike
// those projects' upsert-by-email this can only PATCH a deal that's
// already been created/linked in HubSpot (Deal.hubspotDealId set) — a
// realistic assumption for a copilot that syncs INTO an existing pipeline
// rather than creating deals from scratch. Also assumes custom properties
// named next_step / competitor / risk_score exist on the HubSpot deals
// object (stage maps to the standard dealstage property) — see README.
export function createHubSpotCrmProvider(token: string): CrmProvider {
  return {
    name: "hubspot",
    async applyFieldChanges(hubspotDealId: string | null, changes: CrmFieldChangeInput[]): Promise<CrmApplyResult> {
      if (!hubspotDealId) {
        console.log(`[HubSpot: deal not linked — set Deal.hubspotDealId] would apply ${changes.map((c) => c.fieldName).join(", ")}`);
        return { provider: "log_only", externalId: null };
      }

      const properties = Object.fromEntries(changes.map((c) => [c.fieldName === "stage" ? "dealstage" : c.fieldName, c.value]));

      const res = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${hubspotDealId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ properties }),
      });

      if (!res.ok) throw new Error(`HubSpot deal update failed: ${res.status} ${await res.text()}`);
      const data = (await res.json()) as { id?: string };
      return { provider: "hubspot", externalId: data.id ?? hubspotDealId };
    },
  };
}
