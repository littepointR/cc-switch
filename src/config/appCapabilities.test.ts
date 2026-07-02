import { describe, expect, it } from "vitest";
import type { AppId } from "@/lib/api/types";
import {
  APP_CAPABILITIES,
  APP_IDS,
  MCP_APP_IDS,
  SKILLS_APP_IDS,
  VISIBLE_APP_DEFAULTS,
  appSupports,
  getFeatureApp,
  getFirstVisibleApp,
  isAdditiveLiveConfigApp,
} from "./appCapabilities";

const EXPECTED_APP_IDS: AppId[] = [
  "claude",
  "claude-desktop",
  "codex",
  "gemini",
  "opencode",
  "pi",
  "openclaw",
  "hermes",
];

describe("app capabilities contract", () => {
  it("keeps the app registry exhaustive and ordered", () => {
    expect(APP_IDS).toEqual(EXPECTED_APP_IDS);
    expect(Object.keys(APP_CAPABILITIES)).toEqual(EXPECTED_APP_IDS);
    expect(Object.keys(VISIBLE_APP_DEFAULTS)).toEqual(EXPECTED_APP_IDS);
  });

  it("marks additive apps explicitly", () => {
    expect(APP_IDS.filter(isAdditiveLiveConfigApp)).toEqual([
      "opencode",
      "pi",
      "openclaw",
      "hermes",
    ]);
  });

  it("preserves shared Claude feature routing for Claude Desktop", () => {
    expect(getFeatureApp("claude-desktop")).toBe("claude");
    expect(appSupports(getFeatureApp("claude-desktop"), "skills")).toBe(true);
    expect(appSupports("claude-desktop", "skills")).toBe(false);
    expect(appSupports("claude-desktop", "mcp")).toBe(false);
    expect(appSupports("claude-desktop", "sessions")).toBe(true);
    expect(appSupports("claude-desktop", "failover")).toBe(false);
  });

  it("keeps proxy and failover limited to switch-mode proxy apps", () => {
    expect(APP_IDS.filter((appId) => appSupports(appId, "proxyTakeover"))).toEqual(
      ["claude", "claude-desktop", "codex", "gemini"],
    );
    expect(APP_IDS.filter((appId) => appSupports(appId, "failover"))).toEqual([
      "claude",
      "codex",
      "gemini",
    ]);
  });

  it("keeps provider terminal launches limited to Claude Code", () => {
    expect(APP_IDS.filter((appId) => appSupports(appId, "terminal"))).toEqual([
      "claude",
    ]);
  });

  it("drives shared feature app lists from capabilities", () => {
    expect(SKILLS_APP_IDS).toEqual([
      "claude",
      "codex",
      "gemini",
      "opencode",
      "pi",
      "hermes",
    ]);
    expect(MCP_APP_IDS).toEqual([
      "claude",
      "codex",
      "gemini",
      "opencode",
      "hermes",
    ]);
  });

  it("selects the first visible app with a stable fallback", () => {
    expect(
      getFirstVisibleApp({
        claude: false,
        "claude-desktop": false,
        codex: true,
        gemini: true,
        opencode: true,
        pi: true,
        openclaw: true,
        hermes: true,
      }),
    ).toBe("codex");
    expect(
      getFirstVisibleApp({
        claude: false,
        "claude-desktop": false,
        codex: false,
        gemini: false,
        opencode: false,
        pi: false,
        openclaw: false,
        hermes: false,
      }),
    ).toBe("claude");
  });
});
