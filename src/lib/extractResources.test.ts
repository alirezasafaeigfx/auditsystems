import { describe, expect, it } from "vitest";
import { extractResourcesFromHtml } from "./extractResources";

describe("extractResourcesFromHtml", () => {
  it("extracts script tags with src", () => {
    const html = `<script src="https://example.com/script.js"></script>`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(1);
    expect(resources[0].url).toBe("https://example.com/script.js");
    expect(resources[0].kind).toBe("script");
  });

  it("extracts script tags with async and defer", () => {
    const html = `<script src="script.js" async defer></script>`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(1);
    expect(resources[0].attrs?.async).toBe(true);
    expect(resources[0].attrs?.defer).toBe(true);
  });

  it("extracts link stylesheet", () => {
    const html = `<link rel="stylesheet" href="style.css">`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(1);
    expect(resources[0].kind).toBe("style");
  });

  it("extracts link preload fonts", () => {
    const html = `<link rel="preload" as="font" href="font.woff2">`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(1);
    expect(resources[0].kind).toBe("font");
  });

  it("extracts img tags with src", () => {
    const html = `<img src="image.jpg" alt="test">`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(1);
    expect(resources[0].kind).toBe("img");
    expect(resources[0].attrs?.loading).toBe("");
  });

  it("extracts img tags with srcset", () => {
    const html = `<img srcset="image-1x.jpg 1x, image-2x.jpg 2x">`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(1);
    expect(resources[0].kind).toBe("img");
    expect(resources[0].attrs?.srcset).toBe("used-first-candidate");
  });

  it("extracts source tags with srcset", () => {
    const html = `<source srcset="image.webp" type="image/webp">`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(1);
    expect(resources[0].kind).toBe("img");
    expect(resources[0].attrs?.type).toBe("image/webp");
  });

  it("rejects data URLs", () => {
    const html = `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(0);
  });

  it("identifies third-party resources", () => {
    const html = `<script src="https://cdn.example.com/script.js"></script>`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(1);
    expect(resources[0].isThirdParty).toBe(true);
  });

  it("identifies first-party resources", () => {
    const html = `<script src="https://example.com/script.js"></script>`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(1);
    expect(resources[0].isThirdParty).toBe(false);
  });

  it("detects resources in head", () => {
    const html = `<head><script src="script.js"></script></head><body><img src="image.jpg"></body>`;
    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(2);
    expect(resources[0].inHead).toBe(true);
    expect(resources[1].inHead).toBe(false);
  });

  it("handles complex HTML with multiple resources", () => {
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="style.css">
          <script src="script.js"></script>
        </head>
        <body>
          <img src="image.jpg" alt="test">
          <script src="analytics.js" async></script>
        </body>
      </html>
    `;

    const resources = extractResourcesFromHtml(html, {
      baseUrl: "https://example.com",
      firstPartyHosts: new Set(["example.com"])
    });

    expect(resources).toHaveLength(4);
  });
});
