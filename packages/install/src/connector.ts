import { MockCrmConnector, type CrmConnector } from "@clockwork/connector-core";
import { RechatConnector } from "@clockwork/crm-rechat";

/** Per-tenant CRM configuration. Flipping `type` swaps the adapter — nothing else. */
export type CrmConfig =
  | { type: "mock" }
  | { type: "rechat"; accessToken: string; baseUrl?: string };

/**
 * Connector factory (Task 13 swap seam). The rest of the system codes against
 * `CrmConnector`; this is the one place that knows which adapter to build.
 */
export function createConnector(
  tenantId: string,
  crm: CrmConfig,
): CrmConnector {
  switch (crm.type) {
    case "mock":
      return new MockCrmConnector(tenantId);
    case "rechat":
      return new RechatConnector({
        tenantId,
        accessToken: crm.accessToken,
        baseUrl: crm.baseUrl,
      });
  }
}
