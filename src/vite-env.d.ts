/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROTOTYPE_VERSION?: "version_4" | "version_5";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
