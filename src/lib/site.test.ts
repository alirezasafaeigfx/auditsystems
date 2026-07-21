import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { getAppBaseUrl, toAbsoluteUrl } from "./site";

const SITE_URL = "https://audit.alirezasafaeisystems.ir";
const originalAppBaseUrl = process.env.APP_BASE_URL;

describe("site URL configuration", () => {
  beforeEach(() => {
    process.env.APP_BASE_URL = SITE_URL;
  });

  afterEach(() => {
    if (originalAppBaseUrl === undefined) {
      delete process.env.APP_BASE_URL;
    } else {
      process.env.APP_BASE_URL = originalAppBaseUrl;
    }
  });

  describe("getAppBaseUrl", () => {
    it("returns production URL when APP_BASE_URL is not set", () => {
      delete process.env.APP_BASE_URL;
      const url = getAppBaseUrl();
      expect(url).toBe(SITE_URL);
      expect(url).not.toContain("localhost");
    });

    it("never returns localhost in any environment", () => {
      const url = getAppBaseUrl();
      expect(url).not.toContain("localhost");
      expect(url).not.toContain("127.0.0.1");
      expect(url).not.toContain("0.0.0.0");
    });

    it("returns https URL", () => {
      const url = getAppBaseUrl();
      expect(url).toMatch(/^https:\/\//);
    });
  });

  describe("toAbsoluteUrl", () => {
    it("generates absolute URLs with production domain", () => {
      const url = toAbsoluteUrl("/");
      expect(url).toBe(`${SITE_URL}/`);
      expect(url).not.toContain("localhost");
    });

    it("generates correct absolute URL for paths", () => {
      const url = toAbsoluteUrl("/audit");
      expect(url).toBe(`${SITE_URL}/audit`);
    });

    it("generates correct absolute URL for en paths", () => {
      const url = toAbsoluteUrl("/en");
      expect(url).toBe(`${SITE_URL}/en`);
    });

    it("generates correct absolute URL for nested en paths", () => {
      const url = toAbsoluteUrl("/en/guides");
      expect(url).toBe(`${SITE_URL}/en/guides`);
    });
  });
});
