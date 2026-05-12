/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TENANT_DEFAULT_EN: string
  readonly VITE_TENANT_DEFAULT_ES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
