# OpenLeaf TODO

Remaining codebase improvements to address.

## Moderate Priority

### Inconsistent Loading State Components
- `NotesApp.tsx`: `text-secondary`
- `NoteEditor.tsx`: `text-secondary`
- `NoteList.tsx`: `text-secondary`
- `CreateVault.tsx`: `text-secondary`

**Fix:** Create a `<LoadingMessage message="..." />` component.

### Duplicated Error Display Pattern
- `CreateVault.tsx`: `<p className="text-destructive">{error}</p>`
- `SignIn.tsx`: `<p className="text-destructive">{error}</p>`

**Fix:** Create an `<ErrorMessage message={error} />` component.

### Duplicated Title Extraction Logic
- `NoteEditor.tsx` strips `# ` prefix with regex
- `NoteList.tsx` just takes first line

**Fix:** Create `extractTitle(content: string): string` utility in `lib/utils.ts`.

### Back Link Duplicated
- `create.astro`: `<a href="/" class="text-secondary no-underline hover:text-primary">← Back</a>`
- `signin.astro`: identical

**Fix:** Create a `<BackLink href="/" />` Astro component.

### Inconsistent Path Parsing
- `useNavigation.ts` uses regex `NOTE_ROUTE_REGEX`
- `NotesApp.tsx` uses string manipulation

**Fix:** Use the hook's `getCurrentView()` consistently, or add a `parseNotePath()` utility.

### Type Definitions Split
- `types.ts`: `View`, `NoteData`, `DecryptedNote`
- `db.ts`: `Vault`, `Note` interfaces

**Fix:** Move all interfaces to `types.ts` and import in `db.ts`.

## Minor Priority

### Hardcoded Emoji Logo
- `index.astro`: `<div class="text-2xl">🌿</div>`

**Fix:** Add to constants or create `<Logo />` component.

### Commented Out Code
- `Layout.astro`: `<!-- <!doctype html> -->`

**Fix:** Clean up commented code.

### Raw Button in NoteList
- `NoteList.tsx` uses raw `<button>` for note items instead of `<Button>` component

**Fix:** Create `<NoteListItem>` component or use `<Button variant="ghost">`.

### Import Path Inconsistency
- UI components use `@/lib/utils` and `@/components/ui/button`
- Feature components use relative paths `../../lib/...`

**Fix:** Consistently use `@/` alias everywhere.

### Missing Error Boundaries
No error boundaries around React components.

**Fix:** Add error boundaries around major component trees.

### Magic Number for Vault ID
- `crypto.ts`: `return hashHex.slice(0, 16);`

**Fix:** Add constant `VAULT_ID_LENGTH = 16` to constants.ts.

### Inconsistent Export Patterns
- Some files: `export function CreateVault() {}`
- Some files: `export const NoteEditor = memo(function NoteEditor() {})`

**Fix:** Standardize on one pattern.
