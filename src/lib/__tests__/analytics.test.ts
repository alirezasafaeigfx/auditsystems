import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGtag = vi.fn();
const mockDataLayer: unknown[] = [];

function setupWindow() {
  Object.defineProperty(globalThis, "window", {
    value: {
      gtag: mockGtag,
      dataLayer: mockDataLayer,
      localStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    },
    writable: true,
  });
}

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDataLayer.length = 0;
    setupWindow();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("trackSeoEvent", () => {
    it("does nothing when consent is not granted", async () => {
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const { trackSeoEvent } = await import("../analytics");
      trackSeoEvent("seo_audit_start");
      expect(mockGtag).not.toHaveBeenCalled();
      expect(mockDataLayer).toHaveLength(0);
    });

    it("fires gtag when consent is granted", async () => {
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("granted");
      const { trackSeoEvent } = await import("../analytics");
      trackSeoEvent("seo_audit_start", { url: "https://example.com" });
      expect(mockGtag).toHaveBeenCalledWith("event", "seo_audit_start", {
        url: "https://example.com",
        event_category: "seo",
      });
    });

    it("falls back to dataLayer when gtag is not available", async () => {
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("granted");
      (window as { gtag?: unknown }).gtag = undefined;
      const { trackSeoEvent } = await import("../analytics");
      trackSeoEvent("seo_cta_click", { cta_id: "hero" });
      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toEqual({
        event: "seo_cta_click",
        cta_id: "hero",
        event_category: "seo",
      });
    });

    it("includes event_category seo in all events", async () => {
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("granted");
      const { trackSeoEvent } = await import("../analytics");
      trackSeoEvent("seo_landing_view");
      expect(mockGtag).toHaveBeenCalledWith(
        "event",
        "seo_landing_view",
        expect.objectContaining({ event_category: "seo" })
      );
    });

    it("handles all event names without error", async () => {
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("granted");
      const { trackSeoEvent } = await import("../analytics");
      const events = [
        "seo_landing_view",
        "seo_guide_view",
        "seo_brand_portfolio_view",
        "seo_audit_page_view",
        "seo_audit_start",
        "seo_audit_run_created",
        "seo_unlock_page_view",
        "seo_unlock_started",
        "seo_payment_success",
        "seo_intent_router_view",
        "seo_intent_router_click",
        "seo_cta_click",
      ] as const;

      for (const event of events) {
        expect(() => trackSeoEvent(event)).not.toThrow();
      }
      expect(mockGtag).toHaveBeenCalledTimes(events.length);
    });
  });
});
