import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "field-sizing-content flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none transition-all duration-150 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

export { Textarea };
