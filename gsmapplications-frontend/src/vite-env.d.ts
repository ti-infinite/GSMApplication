/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TENANT_DEFAULT: string
  readonly VITE_TENANT_IDS: string
  readonly VITE_IH_AGENT_URL: string
  readonly VITE_IH_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
