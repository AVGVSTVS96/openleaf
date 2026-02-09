import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

// Create the Convex client
// The URL is set via environment variable VITE_CONVEX_URL or PUBLIC_CONVEX_URL
const convexUrl =
  import.meta.env.PUBLIC_CONVEX_URL || import.meta.env.VITE_CONVEX_URL;

console.log("[Convex] URL:", convexUrl ? "configured" : "not configured");

// Initialize client only if URL is available
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

interface Props {
  children: ReactNode;
}

export function ConvexClientProvider({ children }: Props) {
  // Convex is required for data access in the Convex-first architecture.
  if (!convex) {
    console.error("Convex URL not configured. Set PUBLIC_CONVEX_URL to run OpenLeaf.");
    return null;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

// Export the client for direct use in sync engine
export { convex };
