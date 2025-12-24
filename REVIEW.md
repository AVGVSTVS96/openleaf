# OpenLeaf Technical Review

## Executive Summary

The codebase has a solid foundation but contains **critical architectural flaws** that prevent it from functioning. The most severe issue is that navigation between pages destroys the in-memory encryption key, making the app unusable. Additionally, the encryption layer has an IV reuse bug that would corrupt note data.

---

## 1. What Exists

### Infrastructure
- Astro 5.6 + React 19 integration
- Tailwind CSS v4 with custom theme
- PWA via @vite-pwa/astro
- Vercel adapter
- TypeScript with strict mode

### Crypto Layer (`src/lib/crypto.ts`)
- AES-256-GCM encryption/decryption
- PBKDF2 key derivation (100k iterations, SHA-256)
- Random 12-byte IV per encryption
- Base64 encoding for IndexedDB storage
- Vault verifier system for key validation

### Database Layer (`src/lib/db.ts`)
- Dexie.js wrapper for IndexedDB
- `vault` and `notes` tables
- Schema with updatedAt index

### State (`src/lib/store.ts`)
- Module-level CryptoKey storage
- get/set/clear functions

### UI Components
- Full component library (Button, Input, TextArea, Logo)
- Layout components (TopBar, Background)
- Vault flows (CreateVault, SignIn, MnemonicDisplay)
- Notes UI (NoteList, NoteEditor, NoteItem, SearchBar)

### Pages
All routes from the spec exist: `/`, `/create`, `/signin`, `/notes`, `/notes/[id]`

---

## 2. What Is Missing

| Item | Impact |
|------|--------|
| PWA icons (`icon-192.png`, `icon-512.png`) | PWA installation broken |
| `vaultId` field on notes | Multi-vault support impossible |
| Separate IVs for title/content | Data corruption |
| `@types/bip39` | TypeScript errors |
| SPA routing inside `/notes` | Key destruction on navigation |

---

## 3. Critical Bugs

### 3.1 Navigation Destroys Encryption Key (SEVERE)

The app uses `window.location.href` for navigation:

```typescript
// CreateVault.tsx:36
window.location.href = '/notes';

// SignIn.tsx:51
window.location.href = '/notes';

// NoteList.tsx:97
window.location.href = `/notes/${id}`;

// NoteEditor.tsx:100
window.location.href = '/notes';
```

Each navigation triggers a full page reload. The encryption key in `store.ts` is a module-level variable:

```typescript
let encryptionKey: CryptoKey | null = null;
```

On page reload, this resets to `null`. The app immediately redirects to `/signin` because `isAuthenticated()` returns `false`.

**Result**: App is completely non-functional. After vault creation or sign-in, navigating to `/notes` destroys the key.

### 3.2 IV Reuse Bug (SEVERE)

In `NoteEditor.tsx:67-68`:
```typescript
const { ciphertext: encryptedTitle, iv } = await encrypt(title, key);
const { ciphertext: encryptedContent } = await encrypt(newContent, key);
```

Each `encrypt()` call generates a new random IV. Only the first IV is stored. On decryption, the stored IV is used for both title AND content, but they were encrypted with different IVs.

**Result**: Content decryption produces garbage or fails.

Same bug in `NoteList.tsx:85-86` during note creation.

### 3.3 TypeScript Compilation Errors

```
src/lib/crypto.ts(7,5): error TS2769 - Uint8Array not assignable to BufferSource
src/lib/crypto.ts(48,24): error TS2322 - Same issue
```

These are type compatibility issues with the Web Crypto API typings. Code runs but fails strict type checking.

---

## 4. IndexedDB/Dexie Assessment

### Current Schema
```typescript
interface Note {
  id: string;
  encryptedTitle: string;
  encryptedContent: string;
  iv: string;             // Single IV - BUG
  createdAt: number;
  updatedAt: number;
}
```

### Problems

1. **No `vaultId`**: Notes are global. Multiple vaults on one device = notes mixed together. Signing into vault A tries to decrypt vault B's notes (silent failure).

2. **Single IV**: Insufficient for separate title/content encryption.

### Corrected Schema

Option A - Separate IVs:
```typescript
interface Note {
  id: string;
  vaultId: string;           // Required
  encryptedTitle: string;
  titleIv: string;           // Separate IV
  encryptedContent: string;
  contentIv: string;         // Separate IV
  createdAt: number;
  updatedAt: number;
}
```

Option B - Single encrypted blob (recommended):
```typescript
interface Note {
  id: string;
  vaultId: string;
  encryptedData: string;     // JSON.stringify({ title, content })
  iv: string;
  createdAt: number;
  updatedAt: number;
}
```

Option B is cleaner: one encryption op, one IV, atomic title+content.

---

## 5. Encryption Assessment

### Correct
- AES-256-GCM is appropriate for authenticated encryption
- 12-byte IV is correct for GCM mode
- PBKDF2 at 100k iterations is reasonable (OWASP recommends 600k+ for 2023, but 100k is acceptable)
- BIP39 provides 128 bits of entropy for 12-word mnemonic
- Static salt is acceptable when source material has high entropy
- Verifier pattern is sound (encrypt known plaintext, verify on sign-in)

### Incorrect
- IV reuse across fields (see bug 3.2)
- Minor TypeScript type issues

### Security Notes
- Key derivation uses mnemonic → BIP39 seed (512 bits) → PBKDF2 → AES key
- This is double-derivation (BIP39 already stretches). Consider using seed bytes directly or reducing PBKDF2 iterations since BIP39 already provides key stretching.
- Not a vulnerability, just redundant computation.

---

## 6. Routing Architecture

### The Problem

Astro with React islands works like this:
1. Request `/notes`
2. Server sends HTML + JS bundles
3. React hydrates into page
4. Component imports `store.ts`
5. `store.ts` is fresh module instance → `encryptionKey = null`

Every page navigation = new JavaScript context = key gone.

### The Solution

All authenticated functionality must be a **single React application** without page reloads.

**Recommended Architecture:**
```
/          → Static landing (Astro, no React)
/create    → Astro page + CreateVault island
             (window.location.href to /app after vault creation - OK here)
/signin    → Astro page + SignIn island
             (window.location.href to /app after sign-in - OK here)
/app       → SINGLE React SPA
             ├── List view (default)
             ├── Editor view (client-side routing)
             └── Settings/account view
             All navigation via React state or hash routing
             NO page reloads
```

Inside `/app`, use one of:
1. Hash routing (`/app#/`, `/app#/edit/abc123`)
2. React state (`view: 'list' | 'editor'`, `activeNoteId: string | null`)
3. TanStack Router or Wouter (SPA-style)

React state is simplest for this app's scope.

---

## 7. PWA Assessment

### Configuration
PWA manifest and service worker config are correct in `astro.config.mjs`.

### Missing Files
```
/public/icon-192.png   ← Missing
/public/icon-512.png   ← Missing
```

Manifest references these but only `favicon.svg` exists. PWA installation will fail.

### Recommendations
- Add required PNG icons
- Add Apple touch icons for iOS
- Add maskable icon variant
- Consider adding splash screens

---

## 8. Step-by-Step MVP Instructions

### Phase 1: Fix Encryption Layer

**Step 1.1**: Fix TypeScript errors in `crypto.ts`
```typescript
// Change function signature to accept ArrayBuffer directly
export async function deriveKey(seed: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    seed.buffer as ArrayBuffer,  // Explicit cast
    'PBKDF2',
    false,
    ['deriveKey']
  );
  // ...
}
```

**Step 1.2**: Create single encrypted data blob approach

Replace separate title/content encryption with:
```typescript
// In crypto.ts, add:
export async function encryptNote(
  title: string,
  content: string,
  key: CryptoKey
): Promise<{ encryptedData: string; iv: string }> {
  const data = JSON.stringify({ title, content });
  return encrypt(data, key);
}

export async function decryptNote(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<{ title: string; content: string }> {
  const data = await decrypt(encryptedData, iv, key);
  return JSON.parse(data);
}
```

**Step 1.3**: Update database schema

```typescript
// db.ts
export interface Note {
  id: string;
  vaultId: string;
  encryptedData: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
}

// Update stores
this.version(2).stores({
  vault: 'id',
  notes: 'id, vaultId, updatedAt'
}).upgrade(tx => {
  // Migration: delete old notes (they're corrupted anyway due to IV bug)
  return tx.table('notes').clear();
});
```

### Phase 2: Fix Routing Architecture

**Step 2.1**: Create unified Notes app component

Create `src/components/notes/NotesApp.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { isAuthenticated } from '../../lib/store';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';

type View = 'list' | 'editor';

export function NotesApp() {
  const [view, setView] = useState<View>('list');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/signin';
    }
  }, []);

  function handleSelectNote(id: string) {
    setActiveNoteId(id);
    setView('editor');
  }

  function handleBack() {
    setView('list');
    setActiveNoteId(null);
  }

  function handleCreateNote(id: string) {
    setActiveNoteId(id);
    setView('editor');
  }

  if (view === 'editor' && activeNoteId) {
    return <NoteEditor noteId={activeNoteId} onBack={handleBack} />;
  }

  return <NoteList onSelectNote={handleSelectNote} onCreateNote={handleCreateNote} />;
}
```

**Step 2.2**: Refactor NoteList and NoteEditor

- Remove all `window.location.href` calls
- Pass callbacks for navigation: `onSelectNote`, `onBack`, `onCreateNote`
- Remove authentication checks (parent handles it)

**Step 2.3**: Create single `/app` route

```astro
---
// src/pages/app.astro
import Layout from '../layouts/Layout.astro';
import { NotesApp } from '../components/notes/NotesApp';
---
<Layout title="Notes - OpenLeaf">
  <main class="min-h-screen flex flex-col px-6 py-12 max-w-xl mx-auto">
    <NotesApp client:load />
  </main>
</Layout>
```

**Step 2.4**: Update redirects in CreateVault and SignIn

Change from:
```typescript
window.location.href = '/notes';
```
To:
```typescript
window.location.href = '/app';
```

**Step 2.5**: Delete obsolete files
- `src/pages/notes/index.astro`
- `src/pages/notes/[id].astro`

### Phase 3: Add Vault Association

**Step 3.1**: Pass vaultId through the system

After vault creation/sign-in, store vaultId alongside key:
```typescript
// store.ts
let encryptionKey: CryptoKey | null = null;
let currentVaultId: string | null = null;

export function setSession(key: CryptoKey, vaultId: string): void {
  encryptionKey = key;
  currentVaultId = vaultId;
}

export function getVaultId(): string | null {
  return currentVaultId;
}

export function clearSession(): void {
  encryptionKey = null;
  currentVaultId = null;
}
```

**Step 3.2**: Filter notes by vaultId
```typescript
// In NoteList
const encryptedNotes = await db.notes
  .where('vaultId')
  .equals(vaultId)
  .reverse()
  .sortBy('updatedAt');
```

### Phase 4: Add PWA Icons

**Step 4.1**: Create icons

Generate PNG icons at 192x192 and 512x512 from the leaf design. Place in `/public`:
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png` (180x180)

**Step 4.2**: Update Layout.astro

Add in `<head>`:
```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### Phase 5: Final Cleanup

**Step 5.1**: Remove unused components
- `src/components/notes/NoteItem.tsx` (if not used)
- `src/components/notes/SearchBar.tsx` (if not used - search is inline in NoteList)

**Step 5.2**: Remove unused imports
- `mnemonic` state in NoteList.tsx (line 19)

**Step 5.3**: Add error boundaries

Wrap NotesApp in React error boundary to handle decryption failures gracefully.

---

## 9. Library Recommendations

### Keep
- **dexie** - Best IndexedDB wrapper, actively maintained
- **bip39** - Standard BIP39 implementation
- **@vite-pwa/astro** - Correct choice for Astro PWA
- **lucide-react** - Good icon library

### Consider Adding
| Need | Recommendation | Rationale |
|------|----------------|-----------|
| BIP39 types | `@types/bip39` or inline declarations | Fix TS errors |
| Debounce | `use-debounce` or inline | Current setTimeout approach is fine |
| Hash routing (optional) | `wouter` (2.1kb) | If you want URL-based deep links |

### Do Not Add
- Heavy state managers (Redux, MobX) - overkill
- Form libraries - forms are trivial here
- Markdown preview - explicitly excluded per spec

---

## 10. Files to Modify (Ordered)

1. `src/lib/crypto.ts` - Fix types, add encryptNote/decryptNote
2. `src/lib/db.ts` - Add vaultId, fix schema
3. `src/lib/store.ts` - Add vaultId storage
4. `src/components/notes/NotesApp.tsx` - Create (new file)
5. `src/components/notes/NoteList.tsx` - Refactor for callbacks
6. `src/components/notes/NoteEditor.tsx` - Refactor for callbacks
7. `src/components/vault/CreateVault.tsx` - Update redirect, store vaultId
8. `src/components/vault/SignIn.tsx` - Update redirect, store vaultId
9. `src/pages/app.astro` - Create (new file)
10. `src/pages/notes/index.astro` - Delete
11. `src/pages/notes/[id].astro` - Delete
12. `public/icon-192.png` - Add
13. `public/icon-512.png` - Add

---

## 11. Testing Checklist for MVP

- [ ] Can create new vault
- [ ] Mnemonic displayed correctly
- [ ] Vault creation redirects to app without losing key
- [ ] Can create new note
- [ ] Can edit note content
- [ ] Auto-save works (check IndexedDB)
- [ ] Can navigate back to list without losing key
- [ ] Can search notes
- [ ] Can delete note
- [ ] Can sign out
- [ ] Can sign in with existing mnemonic
- [ ] Notes persist after sign out/in
- [ ] App works offline after first load
- [ ] PWA installable

---

## 12. Architectural Diagram (Target State)

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                               │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Landing (/) │  │ /create     │  │ /signin              │  │
│  │   Astro     │  │  Astro +    │  │  Astro +             │  │
│  │   Static    │  │  React      │  │  React               │  │
│  └─────────────┘  └──────┬──────┘  └──────────┬───────────┘  │
│                          │                     │              │
│                          └──────────┬──────────┘              │
│                                     │                         │
│                          window.location.href                 │
│                                     ▼                         │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                      /app (SPA)                          │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │                   NotesApp                         │  │ │
│  │  │  ┌──────────────┐    ┌───────────────────────────┐ │  │ │
│  │  │  │   NoteList   │◄──►│      NoteEditor           │ │  │ │
│  │  │  │              │    │                           │ │  │ │
│  │  │  │  - Search    │    │  - Textarea               │ │  │ │
│  │  │  │  - Note list │    │  - Auto-save              │ │  │ │
│  │  │  │  - Create    │    │  - Delete                 │ │  │ │
│  │  │  └──────────────┘    └───────────────────────────┘ │  │ │
│  │  │                                                    │  │ │
│  │  │        React state navigation (NO page reload)     │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────────────────┐ │
│  │  store.ts   │  │              IndexedDB                  │ │
│  │             │  │  ┌─────────┐     ┌──────────────────┐   │ │
│  │ CryptoKey   │  │  │  vault  │     │      notes       │   │ │
│  │ vaultId     │  │  │         │     │                  │   │ │
│  │ (in memory) │  │  │ id      │     │ id               │   │ │
│  │             │  │  │ verify  │     │ vaultId          │   │ │
│  └─────────────┘  │  │ created │     │ encryptedData    │   │ │
│                   │  │         │     │ iv               │   │ │
│                   │  └─────────┘     │ created/updated  │   │ │
│                   │                  └──────────────────┘   │ │
│                   └─────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## Summary of Required Changes

| Priority | Change | Effort |
|----------|--------|--------|
| P0 | Fix routing (SPA architecture) | Medium |
| P0 | Fix IV reuse bug | Low |
| P0 | Add vaultId to notes | Low |
| P1 | Fix TypeScript errors | Low |
| P1 | Add PWA icons | Low |
| P2 | Clean up unused code | Trivial |

Estimated effort to MVP: 2-4 hours for an experienced developer.
