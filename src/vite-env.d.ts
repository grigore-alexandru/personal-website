/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MEGA_S4_ENDPOINT: string;
  readonly VITE_MEGA_S4_REGION: string;
  readonly VITE_MEGA_S4_ACCESS_KEY: string;
  readonly VITE_MEGA_S4_SECRET_KEY: string;
  readonly VITE_MEGA_S4_ACCOUNT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
