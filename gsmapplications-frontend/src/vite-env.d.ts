/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TENANT_DEFAULT: string
  readonly VITE_TENANT_IDS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
