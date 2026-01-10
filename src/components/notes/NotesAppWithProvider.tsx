import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { NotesApp } from "./NotesApp";

export function NotesAppWithProvider() {
  return (
    <ConvexClientProvider>
      <SyncProvider>
        <NotesApp />
      </SyncProvider>
    </ConvexClientProvider>
  );
}
