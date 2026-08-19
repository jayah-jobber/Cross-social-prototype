/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROTOTYPE_VERSION?: "version_4" | "version_5";
  readonly VITE_RESEARCH_MODE?: "true" | "false";
  readonly VITE_ENTRY_SURFACE?: "calendar" | "dashboard" | "adhoc";
  readonly VITE_NAVIGATION_STYLE?: "arrows" | "icons" | "progress";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
