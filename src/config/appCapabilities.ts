import type { ManagedAuthProvider } from "@/lib/api/auth";
import type { AppId } from "@/lib/api/types";
import type { VisibleApps } from "@/types";

export type AppCapabilityMode = "switch" | "additive";

export type AppCapabilityKey =
  | "providers"
  | "liveImport"
  | "proxyTakeover"
  | "failover"
  | "mcp"
  | "prompts"
  | "skills"
  | "sessions"
  | "terminal"
  | "usage"
  | "workspace"
  | "openclawHealth"
  | "hermesMemory";

export interface AppCapability {
  id: AppId;
  label: string;
  displayName: string;
  icon: string;
  mode: AppCapabilityMode;
  featureApp: AppId;
  supports: Record<AppCapabilityKey, boolean>;
  managedAuth: ManagedAuthProvider[];
}

export const APP_IDS = [
  "claude",
  "claude-desktop",
  "codex",
  "gemini",
  "opencode",
  "openclaw",
  "hermes",
] as const satisfies readonly AppId[];

export const DEFAULT_APP_ID: AppId = "claude";

export const VISIBLE_APP_DEFAULTS: VisibleApps = {
  claude: true,
  "claude-desktop": true,
  codex: true,
  gemini: true,
  opencode: true,
  openclaw: true,
  hermes: true,
};

const switchSupports = {
  providers: true,
  liveImport: true,
  proxyTakeover: true,
  failover: true,
  mcp: true,
  prompts: true,
  skills: true,
  sessions: true,
  terminal: false,
  usage: true,
  workspace: false,
  openclawHealth: false,
  hermesMemory: false,
} satisfies Record<AppCapabilityKey, boolean>;

export const APP_CAPABILITIES = {
  claude: {
    id: "claude",
    label: "Claude",
    displayName: "Claude Code",
    icon: "claude",
    mode: "switch",
    featureApp: "claude",
    supports: {
      ...switchSupports,
      terminal: true,
    },
    managedAuth: ["github_copilot"],
  },
  "claude-desktop": {
    id: "claude-desktop",
    label: "Claude Desktop",
    displayName: "Claude Desktop",
    icon: "claude",
    mode: "switch",
    featureApp: "claude",
    supports: {
      ...switchSupports,
      failover: false,
      mcp: false,
      skills: false,
      terminal: false,
      usage: false,
    },
    managedAuth: ["github_copilot"],
  },
  codex: {
    id: "codex",
    label: "Codex",
    displayName: "Codex",
    icon: "openai",
    mode: "switch",
    featureApp: "codex",
    supports: switchSupports,
    managedAuth: ["codex_oauth"],
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    displayName: "Gemini",
    icon: "gemini",
    mode: "switch",
    featureApp: "gemini",
    supports: switchSupports,
    managedAuth: [],
  },
  opencode: {
    id: "opencode",
    label: "OpenCode",
    displayName: "OpenCode",
    icon: "opencode",
    mode: "additive",
    featureApp: "opencode",
    supports: {
      ...switchSupports,
      proxyTakeover: false,
      failover: false,
      prompts: false,
    },
    managedAuth: [],
  },
  openclaw: {
    id: "openclaw",
    label: "OpenClaw",
    displayName: "OpenClaw",
    icon: "openclaw",
    mode: "additive",
    featureApp: "openclaw",
    supports: {
      ...switchSupports,
      proxyTakeover: false,
      failover: false,
      mcp: false,
      prompts: false,
      skills: false,
      usage: false,
      workspace: true,
      openclawHealth: true,
    },
    managedAuth: [],
  },
  hermes: {
    id: "hermes",
    label: "Hermes",
    displayName: "Hermes",
    icon: "hermes",
    mode: "additive",
    featureApp: "hermes",
    supports: {
      ...switchSupports,
      proxyTakeover: false,
      failover: false,
      prompts: false,
      hermesMemory: true,
    },
    managedAuth: [],
  },
} as const satisfies Record<AppId, AppCapability>;

export const getAppCapabilities = (): AppCapability[] =>
  APP_IDS.map((id) => APP_CAPABILITIES[id]);

export const getAppCapability = (appId: AppId): AppCapability =>
  APP_CAPABILITIES[appId];

export const appSupports = (
  appId: AppId,
  capability: AppCapabilityKey,
): boolean => APP_CAPABILITIES[appId].supports[capability];

export const getFeatureApp = (appId: AppId): AppId =>
  APP_CAPABILITIES[appId].featureApp;

export const isAdditiveLiveConfigApp = (appId: AppId): boolean =>
  APP_CAPABILITIES[appId].mode === "additive";

export const isValidAppId = (value: string | null): value is AppId =>
  APP_IDS.includes(value as AppId);

export const getVisibleAppIds = (
  visibleApps: VisibleApps = VISIBLE_APP_DEFAULTS,
): AppId[] => APP_IDS.filter((appId) => visibleApps[appId]);

export const getFirstVisibleApp = (
  visibleApps: VisibleApps = VISIBLE_APP_DEFAULTS,
): AppId => getVisibleAppIds(visibleApps)[0] ?? DEFAULT_APP_ID;

export const SKILLS_APP_IDS: AppId[] = APP_IDS.filter((appId) =>
  appSupports(appId, "skills"),
);

export const MCP_APP_IDS: AppId[] = APP_IDS.filter((appId) =>
  appSupports(appId, "mcp"),
);
