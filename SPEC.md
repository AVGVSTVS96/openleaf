# OpenLeaf - Technical Specification

> A privacy-first, offline-available encrypted markdown notes PWA

## Overview

OpenLeaf is a web-based Progressive Web App (PWA) for creating and managing end-to-end encrypted, offline-available markdown notes. Inspired by Rhinoleaf, it emphasizes privacy with encryption keys that never leave the user's device. Notes are encrypted locally before any sync occurs.

### Core Principles

- **Privacy First**: Encryption key never leaves the device or gets sent to servers
- **Offline First**: Full functionality without internet connection
- **Zero Knowledge**: Server (when implemented) only stores encrypted blobs
- **Simplicity**: Minimal, distraction-free UI focused on writing
- **No AI**: No AI features, no data collection, no tracking

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Astro | 5.6 |
| UI Library | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| Local Database | Dexie.js | Latest |
| Storage | IndexedDB | Native |
| Encryption | Web Crypto API | Native |
| Mnemonic Generation | BIP39 | Latest |
| PWA | @vite-pwa/astro | Latest |
| Icons | Lucide React | Latest |

---

## Application Structure

### Routes

```
/                   → Landing page (static, no JS)
/create             → Vault creation (React island)
/signin             → Vault sign-in (React island)
/notes              → Note list view (React island)
/notes/[id]         → Note editor (React island)
```

### Directory Structure

```
openleaf/
├── astro.config.mjs
├── tailwind.config.js
├── package.json
├── public/
│   ├── favicon.svg
│   ├── manifest.json
│   └── sw.js (generated)
├── src/
│   ├── components/
│   │   ├── ui/                    # Shared UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Logo.tsx
│   │   ├── vault/                 # Vault-related components
│   │   │   ├── CreateVault.tsx
│   │   │   ├── SignIn.tsx
│   │   │   └── MnemonicDisplay.tsx
│   │   ├── notes/                 # Notes-related components
│   │   │   ├── NoteList.tsx
│   │   │   ├── NoteItem.tsx
│   │   │   ├── NoteEditor.tsx
│   │   │   └── SearchBar.tsx
│   │   └── layout/                # Layout components
│   │       ├── TopBar.tsx
│   │       └── Background.tsx
│   ├── lib/
│   │   ├── db.ts                  # Dexie database setup
│   │   ├── crypto.ts              # Encryption/decryption utils
│   │   ├── mnemonic.ts            # BIP39 mnemonic generation
│   │   └── store.ts               # Client-side state management
│   ├── layouts/
│   │   └── Layout.astro           # Base layout
│   ├── pages/
│   │   ├── index.astro            # Landing page
│   │   ├── create.astro           # Create vault page
│   │   ├── signin.astro           # Sign in page
│   │   └── notes/
│   │       ├── index.astro        # Note list page
│   │       └── [id].astro         # Note editor page
│   └── styles/
│       └── global.css             # Global styles + Tailwind
└── SPEC.md
```

---

## Features

### Phase 1: Core (MVP)

#### Vault Management
- [ ] Generate 12-word BIP39 mnemonic passphrase
- [ ] Derive encryption key from mnemonic using PBKDF2
- [ ] Store encrypted vault identifier in IndexedDB
- [ ] Sign in with existing mnemonic
- [ ] Validate mnemonic format and checksum
- [ ] Clear vault (logout) functionality

#### Note Management
- [ ] Create new notes
- [ ] Edit notes with raw markdown input
- [ ] Auto-save notes to IndexedDB (debounced)
- [ ] Delete notes
- [ ] List all notes with title and timestamp
- [ ] Search notes by title and content

#### Encryption
- [ ] AES-256-GCM encryption for note content
- [ ] Unique IV per encryption operation
- [ ] Key derivation using Web Crypto API
- [ ] All encryption/decryption happens client-side

#### PWA
- [ ] Service worker for offline caching
- [ ] Web app manifest for installability
- [ ] Offline-first data access
- [ ] App shell caching

### Phase 2: Enhancements (Post-MVP)

- [ ] Server sync (encrypted blobs only)
- [ ] Cross-device access
- [ ] Note export (markdown files)
- [ ] Note import
- [ ] Keyboard shortcuts
- [ ] Dark mode

---

## UI Design Specification

### Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background | Off-white | `#FAFAFA` |
| Primary Text | Black | `#000000` |
| Secondary Text | Gray | `#6B7280` |
| Links/Accent | Red | `#DC2626` |
| Buttons | Gray | `#D1D5DB` |
| Button Hover | Darker Gray | `#9CA3AF` |
| Logo | Green | `#22C55E` |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headers | System Sans | Bold | 2rem+ |
| Body | System Sans | Normal | 1rem |
| Editor | Monospace (Courier/Consolas) | Normal | 1rem |
| Mnemonic | Monospace | Normal | 1rem |

### Layout Principles

- Centered content, max-width ~640px on desktop
- Left-aligned text
- Generous whitespace
- Full-width on mobile
- No sidebars
- Subtle sunset gradient background on landing pages

### Background Effect

- Gradient/blurred image of sunset (pinkish-orange sky, blue water)
- Positioned at bottom of viewport
- Subtle, non-distracting
- Only on landing/auth pages

---

## Data Models

### Database Schema (Dexie/IndexedDB)

```typescript
// Vault table
interface Vault {
  id: string;                    // Primary key
  encryptedVerifier: string;     // Encrypted known value to verify key
  createdAt: number;             // Unix timestamp
}

// Notes table
interface Note {
  id: string;                    // UUID
  encryptedTitle: string;        // AES-GCM encrypted
  encryptedContent: string;      // AES-GCM encrypted
  iv: string;                    // Base64 encoded IV
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
}

// Database version
const db = new Dexie('OpenLeafDB');
db.version(1).stores({
  vault: 'id',
  notes: 'id, updatedAt'
});
```

---

## Encryption Architecture

### Key Derivation Flow

```
Mnemonic (12 words)
        ↓
    BIP39 → Seed (512 bits)
        ↓
    PBKDF2 (100,000 iterations, SHA-256)
        ↓
    AES-256 Key (256 bits)
```

### Encryption Flow

```
Plaintext Note
        ↓
    Generate random IV (12 bytes)
        ↓
    AES-256-GCM Encrypt (key + IV)
        ↓
    Base64 Encode (ciphertext + IV)
        ↓
    Store in IndexedDB
```

### Decryption Flow

```
Encrypted Note from IndexedDB
        ↓
    Base64 Decode
        ↓
    Extract IV
        ↓
    AES-256-GCM Decrypt (key + IV)
        ↓
    Plaintext Note
```

---

## Security Considerations

1. **Key Storage**: Encryption key is NEVER stored. User must enter mnemonic each session.
2. **Memory**: Key exists only in memory during session. Cleared on tab close.
3. **No Server Transmission**: In Phase 1, nothing leaves the device.
4. **IndexedDB Security**: Data at rest is encrypted. Raw data unreadable without key.
5. **HTTPS Only**: App must be served over HTTPS in production.
6. **CSP Headers**: Strict Content Security Policy to prevent XSS.

---

## Page Specifications

### Landing Page (`/`)

**Purpose**: Introduce the app, provide entry points to create/sign-in

**Elements**:
- Logo (leaf icon, green)
- Title: "OpenLeaf"
- Tagline: "End to end encrypted offline markdown notes."
- Sub-tagline: "No AI. Privately yours."
- Link: "Create new vault" → `/create`
- Link: "Sign in to existing vault" → `/signin`
- Trust statement: "100% free to use. No limits. No catch."
- Privacy explanation paragraph
- Footer: Creator attribution

**Behavior**: Static page, no JavaScript required

---

### Create Vault Page (`/create`)

**Purpose**: Generate new vault with mnemonic

**Elements**:
- Security explanation text
- Generated 12-word mnemonic (displayed prominently)
- Warning: "Write it down - it's the only way to access your vault!"
- Button: "Create vault"
- Footer

**Behavior**:
1. On page load: Generate BIP39 mnemonic
2. Display mnemonic in monospace font
3. On "Create vault" click:
   - Derive encryption key
   - Create vault entry in IndexedDB
   - Redirect to `/notes`

---

### Sign In Page (`/signin`)

**Purpose**: Access existing vault with mnemonic

**Elements**:
- Header: "Sign in"
- Input field: Long text input for mnemonic
- Button: "Sign in"
- Footer

**Behavior**:
1. User pastes/types mnemonic
2. Validate mnemonic format
3. Derive encryption key
4. Verify against stored vault (decrypt verifier)
5. On success: Redirect to `/notes`
6. On failure: Show error message

---

### Note List Page (`/notes`)

**Purpose**: Browse and search all notes

**Elements**:
- Top bar with navigation
- Search input: "Search notes"
- Note list (title + timestamp per item)
- Button: "Create note"

**Behavior**:
1. Load and decrypt all notes from IndexedDB
2. Display sorted by `updatedAt` descending
3. Search filters in real-time (title + content)
4. Click note → Navigate to `/notes/[id]`
5. Click "Create note" → Create new note, navigate to editor

---

### Note Editor Page (`/notes/[id]`)

**Purpose**: Edit individual note

**Elements**:
- Top bar with back navigation
- Full-screen textarea/contenteditable
- No toolbar (raw markdown input)

**Behavior**:
1. Load and decrypt note from IndexedDB
2. Display in monospace font
3. Auto-save on change (debounced 500ms)
4. First line becomes title
5. Back button returns to note list

---

## Development Phases

### Phase 1: Foundation (Current)
1. Initialize Astro project with React
2. Set up Tailwind CSS
3. Create basic page routes
4. Implement Dexie database schema
5. Build encryption utilities
6. Create UI components

### Phase 2: Core Features
1. Vault creation flow
2. Sign-in flow
3. Note CRUD operations
4. Search functionality
5. Auto-save implementation

### Phase 3: PWA & Polish
1. Service worker setup
2. Offline caching
3. Web manifest
4. UI polish and animations
5. Error handling
6. Testing

### Phase 4: Future (Post-MVP)
1. Server sync architecture
2. Cross-device support
3. Export/import features

---

## Dependencies

```json
{
  "dependencies": {
    "astro": "^5.6.0",
    "@astrojs/react": "^4.0.0",
    "@astrojs/tailwind": "^6.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "dexie": "^4.0.0",
    "bip39": "^3.1.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@vite-pwa/astro": "^0.5.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

---

## Success Criteria

- [ ] User can create a new vault with generated mnemonic
- [ ] User can sign in with existing mnemonic
- [ ] User can create, edit, and delete notes
- [ ] Notes are encrypted at rest in IndexedDB
- [ ] App works fully offline after first load
- [ ] App is installable as PWA
- [ ] UI matches design specification
- [ ] No data leaves the user's device (Phase 1)
