import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  INTENT_ROUTER_CTA_MAP,
  trackIntentRouterCtaClick,
} from "./intent-router-cta";

vi.mock("./analytics", () => ({
  trackSeoEvent: vi.fn(),
}));

import { trackSeoEvent } from "./analytics";

describe("intent-router-cta adapter", () => {
  beforeEach(() => {
    vi.mocked(trackSeoEvent).mockClear();
  });

  it("maps every IntentRouter route to a registry-shaped entry", () => {
    expect(Object.keys(INTENT_ROUTER_CTA_MAP)).toEqual(["audit", "execution", "toolbox"]);
    for (const entry of Object.values(INTENT_ROUTER_CTA_MAP)) {
      expect(entry.id).toMatch(/^intent_router_/);
      expect(entry.analyticsEvent).toBe("seo_cta_click");
      expect(entry.label.fa).toBeTruthy();
      expect(entry.label.en).toBeTruthy();
    }
  });

  it("tracks unified seo_cta_click with router metadata", () => {
    trackIntentRouterCtaClick("audit", "fa", "audit_first");

    expect(trackSeoEvent).toHaveBeenCalledWith(
      "seo_cta_click",
      expect.objectContaining({
        cta_id: "intent_router_audit_start",
        intent: "audit_start",
        surface: "audit_landing",
        destination: "/audit",
        locale: "fa",
        intent_router_variant: "audit_first",
        legacy_event: "seo_intent_router_click",
      })
    );
  });
});