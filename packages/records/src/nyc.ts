import type { PublicRecords, RecordsProvider } from "@clockwork/agentfolio-core";

/**
 * NYC Open Data (Socrata) records provider. Pulls owner + assessed value by
 * address from a PLUTO-style dataset. Activated only when an app token is set.
 *
 * Note: true ACRIS deeds/mortgages are keyed by BBL and need address→BBL
 * geocoding — deferred (see the Task 11 design note). The network path is
 * unit-tested via an injected fetch.
 */
export interface NycOpenDataOptions {
  appToken: string;
  /** Socrata dataset resource id (default: a PLUTO-style dataset). */
  datasetId?: string;
  fetchImpl?: typeof fetch;
}

interface SocrataRow {
  ownername?: string;
  assesstot?: string;
  address?: string;
}

const DEFAULT_DATASET = "64uk-42ks"; // NYC PLUTO (overridable)
const BASE = "https://data.cityofnewyork.us/resource";

export class NycOpenDataRecordsProvider implements RecordsProvider {
  private readonly appToken: string;
  private readonly datasetId: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: NycOpenDataOptions) {
    this.appToken = opts.appToken;
    this.datasetId = opts.datasetId ?? DEFAULT_DATASET;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async lookup(address: string): Promise<PublicRecords | null> {
    const upper = address.trim().toUpperCase();
    if (!upper) {
      return null;
    }
    const url =
      `${BASE}/${this.datasetId}.json` +
      `?$where=${encodeURIComponent(`upper(address)='${upper.replace(/'/g, "''")}'`)}` +
      `&$limit=1`;

    const res = await this.fetchImpl(url, {
      headers: { "X-App-Token": this.appToken },
    });
    if (!res.ok) {
      throw new Error(`nyc_open_data_failed: ${res.status}`);
    }

    const rows = (await res.json()) as SocrataRow[];
    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      owner: row.ownername,
      assessedValue: row.assesstot ? Number(row.assesstot) : undefined,
      source: "nyc_open_data",
      pulledAt: new Date().toISOString(),
    };
  }
}
