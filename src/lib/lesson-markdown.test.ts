import { describe, expect, it } from "vitest";

import { parseInlineStyles, stripHtml } from "@/lib/lesson-markdown";

describe("parseInlineStyles", () => {
  it("renders bold and italic without leftover asterisks", () => {
    const html = parseInlineStyles(
      "undo *just that change* and **never** rewrite",
    );
    expect(html).toContain("<em");
    expect(html).toContain("<strong");
    expect(stripHtml(html)).toBe("undo just that change and never rewrite");
  });

  it("protects code spans so asterisks inside backticks stay literal", () => {
    const html = parseInlineStyles("run `echo *star*` please");
    expect(html).toContain("echo *star*");
    expect(stripHtml(html)).toBe("run echo *star* please");
  });

  it("handles italic wrapping a parenthetical with nested code", () => {
    const html = parseInlineStyles("*(or `git switch feature/login`)*");
    expect(html).toContain("<em");
    expect(html).toContain("<code");
    expect(stripHtml(html)).toBe("(or git switch feature/login)");
  });
});
