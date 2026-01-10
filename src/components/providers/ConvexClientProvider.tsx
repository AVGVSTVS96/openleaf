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
  // If no Convex URL configured, render children without provider
  // This allows the app to work in offline-only mode
  if (!convex) {
    console.warn(
      "Convex URL not configured. Running in offline-only mode. Set PUBLIC_CONVEX_URL to enable sync."
    );
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

// Export the client for direct use in sync engine
export { convex };
