import type { PublicRecords, RecordsProvider } from "@clockwork/agentfolio-core";

/**
 * Deterministic, offline records provider (default; tests + no-token demo).
 * Derives plausible-looking values from the address so the demo shows records
 * without any network call.
 */
export class StubRecordsProvider implements RecordsProvider {
  async lookup(address: string): Promise<PublicRecords | null> {
    if (!address.trim()) {
      return null;
    }
    const seed = hash(address);
    const assessed = 250_000 + (seed % 750) * 1_000;
    return {
      owner: `${pickName(seed)} (record owner)`,
      assessedValue: assessed,
      lastSalePrice: Math.round(assessed * 1.15),
      lastSaleDate: `20${10 + (seed % 15)}-0${1 + (seed % 9)}-15`,
      source: "stub",
      pulledAt: new Date().toISOString(),
    };
  }
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

const NAMES = ["Rivera", "Chen", "Okafor", "Nguyen", "Patel", "Goldberg"];
function pickName(seed: number): string {
  return NAMES[seed % NAMES.length];
}
