import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function useVaultNotes(vaultId: string | null) {
  return useQuery(api.notes.list, vaultId ? { vaultId } : "skip");
}

export function useNoteById(vaultId: string | null, noteId: string) {
  return useQuery(api.notes.getByNoteId, vaultId ? { vaultId, noteId } : "skip");
}

export function useUpsertNote() {
  return useMutation(api.notes.upsert);
}

export function useDeleteNote() {
  return useMutation(api.notes.remove);
}
