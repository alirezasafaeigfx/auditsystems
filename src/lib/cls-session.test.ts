import { describe, expect, it } from "vitest";
import { createClsSession } from "./cls-session";

describe("CLS session windows", () => {
  it("uses the largest burst rather than lifetime sum", () => {
    const session = createClsSession();
    session.observe(0, 0.1, false);
    session.observe(500, 0.1, false);
    session.observe(2500, 0.1, false);
    expect(session.value()).toBe(0.2);
  });

  it("caps a burst at five seconds and ignores recent input", () => {
    const session = createClsSession();
    session.observe(0, 0.1, false);
    session.observe(900, 0.1, true);
    session.observe(800, 0.1, false);
    session.observe(1700, 0.1, false);
    session.observe(2600, 0.1, false);
    session.observe(3500, 0.1, false);
    session.observe(4400, 0.1, false);
    session.observe(5300, 0.1, false);
    expect(session.value()).toBe(0.6);
  });
});
