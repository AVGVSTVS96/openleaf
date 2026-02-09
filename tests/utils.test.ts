import { describe, expect, it } from "bun:test";
import { extractTitle } from "../src/lib/utils";

describe("extractTitle", () => {
  it("returns Untitled for empty content", () => {
    expect(extractTitle("")).toBe("Untitled");
    expect(extractTitle("   \n")).toBe("Untitled");
  });

  it("prefers the first markdown heading", () => {
    const content = "# Hello World\nSecond line";
    expect(extractTitle(content)).toBe("Hello World");
  });

  it("uses the first non-empty line when no heading exists", () => {
    const content = "\n\nFirst line\nSecond line";
    expect(extractTitle(content)).toBe("First line");
  });

  it("truncates long lines with ellipsis", () => {
    const longLine = "a".repeat(60);
    expect(extractTitle(longLine)).toBe(`${"a".repeat(50)}...`);
  });
});
