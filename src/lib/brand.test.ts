import { describe, expect, it } from "vitest";
import {
  ASDEV_BRAND,
  getAsdevSignature,
  buildAsdevNetworkLinks,
} from "./brand";

describe("ASDEV_BRAND constants", () => {
  it("has all required fields", () => {
    expect(ASDEV_BRAND.masterBrand).toBeDefined();
    expect(ASDEV_BRAND.ownerNameFa).toBeDefined();
    expect(ASDEV_BRAND.ownerNameEn).toBeDefined();
    expect(ASDEV_BRAND.ownerSiteUrl).toContain("https://");
  });
});

describe("getAsdevSignature", () => {
  it("returns Persian name for FA locale", () => {
    expect(getAsdevSignature("fa")).toBe(ASDEV_BRAND.ownerNameFa);
  });

  it("returns English name for EN locale", () => {
    expect(getAsdevSignature("en")).toBe(ASDEV_BRAND.ownerNameEn);
  });
});

describe("buildAsdevNetworkLinks", () => {
  it("returns 3 network links", () => {
    const links = buildAsdevNetworkLinks("audit", "footer");
    expect(links).toHaveLength(3);
  });

  it("includes UTM parameters", () => {
    const links = buildAsdevNetworkLinks("audit", "footer");
    for (const link of links) {
      const url = new URL(link.href);
      expect(url.searchParams.get("utm_source")).toBe("audit");
      expect(url.searchParams.get("utm_medium")).toBe("cross_site");
      expect(url.searchParams.get("utm_content")).toBe("footer");
    }
  });

  it("each link has a key, label, and href", () => {
    const links = buildAsdevNetworkLinks("audit", "asdev_page");
    for (const link of links) {
      expect(link.key).toBeDefined();
      expect(link.label).toBeDefined();
      expect(link.href).toContain("https://");
    }
  });
});
