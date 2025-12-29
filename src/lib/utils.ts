import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TITLE_REGEX = /^#\s*/;

export function extractTitle(content: string): string {
  const lines = content.split("\n");
  const firstLine = lines[0] || "";
  return firstLine.replace(TITLE_REGEX, "").trim() || "Untitled";
}
