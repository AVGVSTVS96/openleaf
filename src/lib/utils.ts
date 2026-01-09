import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const HEADING_REGEX = /^#{1,6}\s+(.+)$/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractTitle(content: string): string {
  if (!content) {
    return "Untitled";
  }

  const lines = content.trim().split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const headingMatch = trimmed.match(HEADING_REGEX);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    return trimmed.slice(0, 50) + (trimmed.length > 50 ? "..." : "");
  }

  return "Untitled";
}
