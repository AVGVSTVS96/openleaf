import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { NotesApp } from "./NotesApp";

export function NotesAppWithProvider() {
  return (
    <ConvexClientProvider>
      <NotesApp />
    </ConvexClientProvider>
  );
}
