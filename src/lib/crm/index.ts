import type { CrmProvider } from "./types";
import { createHubSpotCrmProvider } from "./hubspot";
import { logOnlyCrmProvider } from "./logOnly";

export function getCrmProvider(): CrmProvider {
  if (process.env.HUBSPOT_API_KEY) return createHubSpotCrmProvider(process.env.HUBSPOT_API_KEY);
  return logOnlyCrmProvider;
}

export type { CrmProvider, CrmFieldChangeInput, CrmApplyResult } from "./types";
