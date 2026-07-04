import { describe, expect, it } from "vitest";
import { createSlug } from "./organization";

describe("createSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(createSlug("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(createSlug("test@#$%&*()")).toBe("test");
  });

  it("collapses multiple hyphens", () => {
    expect(createSlug("a---b---c")).toBe("a-b-c");
  });

  it("trims leading and trailing hyphens", () => {
    expect(createSlug("-hello-")).toBe("hello");
  });

  it("truncates at 48 characters", () => {
    const long = "a".repeat(100);
    expect(createSlug(long).length).toBe(48);
  });

  it("returns 'org' for empty input", () => {
    expect(createSlug("")).toBe("org");
    expect(createSlug("!!!")).toBe("org");
  });
});
