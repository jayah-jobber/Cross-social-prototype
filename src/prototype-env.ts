export type ResearchEntrySurface = "calendar" | "dashboard" | "adhoc";
export type ResearchNavigationStyle = "arrows" | "icons";
export type LockedPrototypeVersion = "v4" | "v5";

const VERSION_MAP = {
  version_4: "v4",
  version_5: "v5",
} as const;

function parseBoolean(name: string, value: string | undefined): boolean {
  if (value === undefined) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be "true" or "false"; received "${value}".`);
}

function parseEnum<const T extends readonly string[]>(
  name: string,
  value: string | undefined,
  values: T,
  fallback: T[number],
): T[number] {
  if (value === undefined) return fallback;
  if (values.includes(value)) return value as T[number];
  throw new Error(`${name} must be one of ${values.join(", ")}; received "${value}".`);
}

function parseNavigationStyle(value: string | undefined): ResearchNavigationStyle {
  if (value === "progress") return "icons";
  return parseEnum(
    "VITE_NAVIGATION_STYLE",
    value,
    ["arrows", "icons"] as const,
    "arrows",
  );
}

const researchMode = parseBoolean(
  "VITE_RESEARCH_MODE",
  import.meta.env.VITE_RESEARCH_MODE,
);
const configuredVersion = import.meta.env.VITE_PROTOTYPE_VERSION;

if (researchMode && configuredVersion && configuredVersion !== "version_4") {
  throw new Error("VITE_RESEARCH_MODE=true only supports VITE_PROTOTYPE_VERSION=version_4.");
}

export const prototypeEnv = {
  researchMode,
  lockedVersion: researchMode
    ? "v4"
    : configuredVersion
      ? VERSION_MAP[configuredVersion]
      : undefined,
  entrySurface: researchMode
    ? parseEnum(
        "VITE_ENTRY_SURFACE",
        import.meta.env.VITE_ENTRY_SURFACE,
        ["calendar", "dashboard", "adhoc"] as const,
        "calendar",
      )
    : "calendar",
  navigationStyle: researchMode
    ? parseNavigationStyle(import.meta.env.VITE_NAVIGATION_STYLE)
    : "arrows",
} satisfies {
  researchMode: boolean;
  lockedVersion: LockedPrototypeVersion | undefined;
  entrySurface: ResearchEntrySurface;
  navigationStyle: ResearchNavigationStyle;
};
