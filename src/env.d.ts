/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/client" />

import { Buffer as BufferType } from "buffer";

declare global {
  interface Window {
    Buffer: typeof BufferType;
  }
}
