import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FolderOpen, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AppId } from "@/lib/api";
import { providersApi, settingsApi } from "@/lib/api";
import type { LaunchProfile, Provider } from "@/types";
import type { SettingsFormState } from "@/hooks/useSettings";
import {
  APP_IDS,
  appSupports,
  getAppCapability,
} from "@/config/appCapabilities";
import { getProvidersQueryOptions } from "@/lib/query";
import { extractErrorMessage } from "@/utils/errorUtils";
import { getTerminalOptions } from "@/components/settings/TerminalSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LaunchProfilesPanelProps {
  profiles?: LaunchProfile[];
  onChange: (updates: Partial<SettingsFormState>) => Promise<boolean>;
}

const DEFAULT_PROVIDER = "__current__";
const DEFAULT_TERMINAL = "__default__";
const LAUNCH_PROFILE_APP_IDS = APP_IDS.filter((appId) =>
  appSupports(appId, "terminal"),
);

const createProfileId = (): string =>
  `launch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const nowIso = (): string => new Date().toISOString();

export function LaunchProfilesPanel({
  profiles = [],
  onChange,
}: LaunchProfilesPanelProps) {
  const { t } = useTranslation();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [draftProfiles, setDraftProfiles] = useState<LaunchProfile[]>(profiles);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const providerQueries = useQueries({
    queries: LAUNCH_PROFILE_APP_IDS.map((appId) =>
      getProvidersQueryOptions(appId),
    ),
  });
  const terminalOptions = getTerminalOptions();

  useEffect(() => {
    setDraftProfiles(profiles);
  }, [profiles]);

  const providersByApp = useMemo(() => {
    return Object.fromEntries(
      LAUNCH_PROFILE_APP_IDS.map((appId, index) => [
        appId,
        providerQueries[index].data?.providers ?? {},
      ]),
    ) as Record<AppId, Record<string, Provider>>;
  }, [providerQueries]);

  const persistProfiles = (nextProfiles: LaunchProfile[]) => {
    setDraftProfiles(nextProfiles);
    const task = saveQueueRef.current
      .catch(() => false)
      .then(() => onChange({ launchProfiles: nextProfiles }));
    saveQueueRef.current = task;
    return task;
  };

  const handleAdd = async () => {
    const timestamp = nowIso();
    const newProfile: LaunchProfile = {
      id: createProfileId(),
      name: t("launchProfiles.defaultName", {
        defaultValue: "New launch profile",
      }),
      appId: "claude",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await persistProfiles([...draftProfiles, newProfile]);
  };

  const updateProfile = (
    profileId: string,
    updates: Partial<LaunchProfile>,
  ) => {
    const next = draftProfiles.map((profile) =>
      profile.id === profileId
        ? { ...profile, ...updates, updatedAt: nowIso() }
        : profile,
    );
    return persistProfiles(next);
  };

  const deleteProfile = async (profileId: string) => {
    await persistProfiles(
      draftProfiles.filter((profile) => profile.id !== profileId),
    );
  };

  const pickDirectory = async (profile: LaunchProfile) => {
    try {
      const selected = await settingsApi.pickDirectory(profile.cwd);
      if (selected) {
        await updateProfile(profile.id, { cwd: selected });
      }
    } catch (error) {
      toast.error(
        t("launchProfiles.pickDirectoryFailed", {
          defaultValue: "Failed to select directory",
        }) + `: ${extractErrorMessage(error)}`,
      );
    }
  };

  const launchProfile = async (profile: LaunchProfile) => {
    setRunningId(profile.id);
    try {
      const providerId =
        profile.providerId || (await providersApi.getCurrent(profile.appId));
      if (!providerId) {
        toast.error(
          t("launchProfiles.noProvider", {
            defaultValue: "No provider is selected for this app.",
          }),
        );
        return;
      }

      await providersApi.openTerminal(providerId, profile.appId, {
        cwd: profile.cwd,
        terminal: profile.terminal,
      });
      toast.success(
        t("provider.terminalOpened", {
          defaultValue: "Terminal opened",
        }),
      );
    } catch (error) {
      toast.error(
        t("provider.terminalOpenFailed", {
          defaultValue: "Failed to open terminal",
        }) + `: ${extractErrorMessage(error)}`,
      );
    } finally {
      setRunningId(null);
    }
  };

  const visibleProfiles = draftProfiles.filter((profile) =>
    appSupports(profile.appId, "terminal"),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">
            {t("launchProfiles.title", { defaultValue: "Launch Profiles" })}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("launchProfiles.description", {
              defaultValue:
                "Save local Claude Code terminal shortcuts with provider and working directory.",
            })}
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void handleAdd()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("common.add", { defaultValue: "Add" })}
        </Button>
      </div>

      {visibleProfiles.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("launchProfiles.empty", {
            defaultValue: "No launch profiles yet.",
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleProfiles.map((profile) => (
            <LaunchProfileCard
              key={profile.id}
              profile={profile}
              providers={providersByApp[profile.appId] ?? {}}
              terminalOptions={terminalOptions}
              running={runningId === profile.id}
              onUpdate={(updates) => updateProfile(profile.id, updates)}
              onDelete={() => void deleteProfile(profile.id)}
              onPickDirectory={() => void pickDirectory(profile)}
              onLaunch={() => void launchProfile(profile)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LaunchProfileCardProps {
  profile: LaunchProfile;
  providers: Record<string, Provider>;
  terminalOptions: ReturnType<typeof getTerminalOptions>;
  running: boolean;
  onUpdate: (updates: Partial<LaunchProfile>) => Promise<boolean>;
  onDelete: () => void;
  onPickDirectory: () => void;
  onLaunch: () => void;
}

function LaunchProfileCard({
  profile,
  providers,
  terminalOptions,
  running,
  onUpdate,
  onDelete,
  onPickDirectory,
  onLaunch,
}: LaunchProfileCardProps) {
  const { t } = useTranslation();
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [cwdDraft, setCwdDraft] = useState(profile.cwd ?? "");
  const capability = getAppCapability(profile.appId);

  useEffect(() => {
    setNameDraft(profile.name);
    setCwdDraft(profile.cwd ?? "");
  }, [profile.id, profile.name, profile.cwd]);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(profile.name);
      toast.error(
        t("launchProfiles.nameRequired", {
          defaultValue: "Profile name cannot be empty.",
        }),
      );
      return;
    }
    if (trimmed !== profile.name) {
      void onUpdate({ name: trimmed });
    }
  };

  const commitCwd = () => {
    const trimmed = cwdDraft.trim();
    const nextCwd = trimmed || undefined;
    if ((profile.cwd ?? undefined) !== nextCwd) {
      void onUpdate({ cwd: nextCwd });
    }
  };

  return (
    <div className="rounded-lg border bg-background/60 p-4">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.75fr_0.9fr]">
        <div className="space-y-1.5">
          <Label>{t("launchProfiles.name", { defaultValue: "Name" })}</Label>
          <Input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("launchProfiles.app", { defaultValue: "App" })}</Label>
          <Select value={profile.appId} disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAUNCH_PROFILE_APP_IDS.map((appId) => (
                <SelectItem key={appId} value={appId}>
                  {getAppCapability(appId).displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            {t("launchProfiles.provider", {
              defaultValue: "Provider",
            })}
          </Label>
          <Select
            value={profile.providerId ?? DEFAULT_PROVIDER}
            onValueChange={(value) =>
              void onUpdate({
                providerId: value === DEFAULT_PROVIDER ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_PROVIDER}>
                {t("launchProfiles.currentProvider", {
                  defaultValue: `Current ${capability.displayName} provider`,
                })}
              </SelectItem>
              {Object.values(providers).map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[0.45fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label>
            {t("settings.terminal.title", {
              defaultValue: "Terminal",
            })}
          </Label>
          <Select
            value={profile.terminal ?? DEFAULT_TERMINAL}
            onValueChange={(value) =>
              void onUpdate({
                terminal: value === DEFAULT_TERMINAL ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_TERMINAL}>
                {t("launchProfiles.defaultTerminal", {
                  defaultValue: "Use global terminal setting",
                })}
              </SelectItem>
              {terminalOptions.map((terminal) => (
                <SelectItem key={terminal.value} value={terminal.value}>
                  {t(terminal.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            {t("launchProfiles.cwd", { defaultValue: "Working directory" })}
          </Label>
          <div className="flex gap-2">
            <Input
              value={cwdDraft}
              placeholder={t("launchProfiles.cwdPlaceholder", {
                defaultValue: "Use terminal default directory",
              })}
              onChange={(event) => setCwdDraft(event.target.value)}
              onBlur={commitCwd}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onPickDirectory}
              title={t("common.browse", { defaultValue: "Browse" })}
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onLaunch}
            disabled={running}
          >
            <Play className="mr-2 h-4 w-4" />
            {t("launchProfiles.launch", { defaultValue: "Launch" })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title={t("common.delete", { defaultValue: "Delete" })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
