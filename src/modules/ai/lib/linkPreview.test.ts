import { describe, expect, it } from "vitest";

import {
  cleanPreviewUrl,
  extractLinkPreviewSeeds,
  parseLinkPreviewMeta,
} from "./linkPreview";

describe("linkPreview", () => {
  it("trims trailing punctuation from URLs", () => {
    expect(cleanPreviewUrl("https://example.com/test).")).toBe(
      "https://example.com/test",
    );
  });

  it("extracts unique remote and file previews", () => {
    expect(
      extractLinkPreviewSeeds(
        "See https://example.com/docs?x=1 and file:///C:/repo/README.md and https://example.com/docs?x=1",
      ),
    ).toEqual([
      {
        url: "https://example.com/docs?x=1",
        host: "example.com",
        path: "/docs?x=1",
        kind: "remote",
      },
      {
        url: "file:///C:/repo/README.md",
        host: "Local file",
        path: "/C:/repo/README.md",
        kind: "file",
      },
    ]);
  });

  it("parses open graph metadata and resolves relative images", () => {
    const html = `
      <html>
        <head>
          <title>Fallback title</title>
          <meta property="og:title" content="Preview title" />
          <meta property="og:description" content="Preview description" />
          <meta property="og:image" content="/cover.png" />
          <meta property="og:site_name" content="Preview Site" />
        </head>
      </html>
    `;

    expect(parseLinkPreviewMeta(html, "https://example.com/post")).toEqual({
      title: "Preview title",
      description: "Preview description",
      imageUrl: "https://example.com/cover.png",
      siteName: "Preview Site",
    });
  });
});
