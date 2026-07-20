import { describe, expect, it } from "vitest";
import { resolveDataUrl } from "./dataClient";

describe("data client", () => {
  it("uses static paths in production", () => {
    expect(resolveDataUrl("manifest", true)).toBe("./data/manifest.json");
    expect(resolveDataUrl("greeks-delta", true)).toBe("./data/greeks-delta.json");
  });
  it("uses FastAPI paths during local development", () => {
    expect(resolveDataUrl("manifest", false)).toBe("/api/v1/charts");
    expect(resolveDataUrl("greeks-delta", false)).toBe("/api/v1/charts/greeks-delta");
  });
});
