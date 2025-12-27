# OpenLeaf

End-to-end encrypted offline markdown notes app.

## Tech Stack

- Astro 5 with React 19 islands
- Tailwind CSS 4
- Dexie.js (IndexedDB)
- Web Crypto API (AES-GCM)
- bip39 (mnemonic seed phrases)
- PWA with Workbox
- Deployed on Vercel

## Architecture

- Vaults protected by 12-word BIP39 mnemonic
- Key derived via PBKDF2, notes encrypted with AES-GCM
- All data stored locally in IndexedDB - fully offline-capable

## Commands

Use bun, not npm.

```
bun install
bun run dev
bun run build
```

## Notes

- bip39 requires Buffer polyfill (dynamically imported in mnemonic.ts)
- Crypto only works in secure contexts (HTTPS)
