import { describe, it, expect, vi } from "vitest";
import { NycOpenDataRecordsProvider } from "./nyc.js";

function fakeFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), { status: ok ? 200 : 500 }),
  ) as unknown as typeof fetch;
}

describe("NycOpenDataRecordsProvider", () => {
  it("maps a Socrata row to PublicRecords and sends the app token", async () => {
    const fetchImpl = fakeFetch([{ ownername: "JANE DOE", assesstot: "640000" }]);
    const provider = new NycOpenDataRecordsProvider({
      appToken: "tok-123",
      fetchImpl,
    });
    const records = await provider.lookup("12 Maple St");
    expect(records?.owner).toBe("JANE DOE");
    expect(records?.assessedValue).toBe(640000);
    expect(records?.source).toBe("nyc_open_data");

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const init = call[1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-App-Token"]).toBe(
      "tok-123",
    );
    expect(decodeURIComponent(String(call[0]))).toContain("12 MAPLE ST");
  });

  it("returns null when there is no matching row", async () => {
    const provider = new NycOpenDataRecordsProvider({
      appToken: "t",
      fetchImpl: fakeFetch([]),
    });
    expect(await provider.lookup("nowhere")).toBeNull();
  });

  it("returns null for a blank address without calling the API", async () => {
    const fetchImpl = fakeFetch([]);
    const provider = new NycOpenDataRecordsProvider({ appToken: "t", fetchImpl });
    expect(await provider.lookup("  ")).toBeNull();
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("throws on an API error", async () => {
    const provider = new NycOpenDataRecordsProvider({
      appToken: "t",
      fetchImpl: fakeFetch([], false),
    });
    await expect(provider.lookup("12 Maple St")).rejects.toThrow(
      /nyc_open_data_failed/,
    );
  });
});
