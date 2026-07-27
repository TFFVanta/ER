import { describe, expect, it } from "vitest";
import { listReservedHosts, resolveSurface } from "./portalConfig.js";

describe("resolveSurface", () => {
  it("maps the public hostnames to the public surface", () => {
    expect(resolveSurface("mingo.center").key).toBe("public");
    expect(resolveSurface("www.mingo.center").key).toBe("public");
  });

  it("maps the portal and ops hosts to dedicated surfaces", () => {
    expect(resolveSurface("portal.mingo.center").key).toBe("portal");
    expect(resolveSurface("ops.mingo.center").key).toBe("ops");
  });

  it("falls back to the public surface for unknown hosts", () => {
    expect(resolveSurface("preview.mingo.center").key).toBe("public");
  });
});

describe("listReservedHosts", () => {
  it("exposes the expected production hostnames", () => {
    const hosts = listReservedHosts().map((entry) => entry.hostname);
    expect(hosts).toContain("portal.mingo.center");
    expect(hosts).toContain("ops.mingo.center");
    expect(hosts).toContain("status.mingo.center");
  });
});
