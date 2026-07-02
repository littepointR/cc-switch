import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Gauge,
  ListTree,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppId } from "@/lib/api";
import type { VisibleApps } from "@/types";
import { ProviderIcon } from "@/components/ProviderIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { useManagedAuthOverview } from "@/hooks/useManagedAuthOverview";

interface OpsDashboardProps {
  activeApp: AppId;
  visibleApps: VisibleApps;
  onOpenProviders: (appId: AppId) => void;
  onOpenSettings: (tab: string) => void;
}

const formatPercent = (value: number): string =>
  Number.isFinite(value) ? `${value.toFixed(1)}%` : "--";

const formatUsd = (value: string): string => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? `$${parsed.toFixed(4)}` : "$0.0000";
};

const formatInt = (value: number): string =>
  Number.isFinite(value) ? value.toLocaleString() : "0";

export function OpsDashboard({
  activeApp,
  visibleApps,
  onOpenProviders,
  onOpenSettings,
}: OpsDashboardProps) {
  const { t } = useTranslation();
  const overview = useDashboardOverview(visibleApps);
  const authOverview = useManagedAuthOverview();
  const activeRow =
    overview.visibleApps.find((row) => row.appId === activeApp) ??
    overview.visibleApps[0];
  const authAccountCount = authOverview.reduce(
    (sum, item) => sum + item.accountCount,
    0,
  );
  const boundAuthCount = authOverview.reduce(
    (sum, item) => sum + item.boundProviderCount,
    0,
  );
  const orphanAuthCount = authOverview.reduce(
    (sum, item) => sum + item.orphanBindingCount,
    0,
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-6">
      <div className="flex-1 overflow-y-auto pb-12">
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {t("dashboard.title", { defaultValue: "Ops Dashboard" })}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("dashboard.subtitle", {
                    defaultValue:
                      "Routing, failover, account, and usage status in one place.",
                  })}
                </p>
              </div>
              <Badge
                variant={overview.proxyRunning ? "default" : "secondary"}
                className={
                  overview.proxyRunning
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : undefined
                }
              >
                {overview.proxyRunning
                  ? t("settings.advanced.proxy.running")
                  : t("settings.advanced.proxy.stopped")}
              </Badge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                icon={Network}
                label={t("dashboard.proxyEndpoint", {
                  defaultValue: "Proxy endpoint",
                })}
                value={
                  overview.proxyRunning
                    ? `${overview.proxyAddress}:${overview.proxyPort}`
                    : t("common.disabled", { defaultValue: "Disabled" })
                }
              />
              <MetricTile
                icon={Activity}
                label={t("dashboard.proxyRequests", {
                  defaultValue: "Proxy requests",
                })}
                value={formatInt(overview.totalRequests)}
              />
              <MetricTile
                icon={Gauge}
                label={t("dashboard.successRate", {
                  defaultValue: "Success rate",
                })}
                value={formatPercent(overview.successRate)}
              />
              <MetricTile
                icon={ListTree}
                label={t("dashboard.failovers", {
                  defaultValue: "Failovers",
                })}
                value={formatInt(overview.failoverCount)}
              />
            </div>

            {overview.lastError && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-words">{overview.lastError}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  {t("dashboard.todayUsage", { defaultValue: "Today" })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.todayUsageDescription", {
                    defaultValue: "Usage captured by local routing and sessions.",
                  })}
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricTile
                icon={Activity}
                label={t("usage.totalRequests")}
                value={formatInt(overview.usageToday.totalRequests)}
              />
              <MetricTile
                icon={BarChart3}
                label={t("usage.totalCost")}
                value={formatUsd(overview.usageToday.totalCost)}
              />
              <MetricTile
                icon={Gauge}
                label={t("usage.totalTokens", {
                  defaultValue: "Total tokens",
                })}
                value={formatInt(overview.usageToday.totalTokens)}
              />
              <MetricTile
                icon={CheckCircle2}
                label={t("dashboard.usageSuccessRate", {
                  defaultValue: "Usage success",
                })}
                value={formatPercent(overview.usageToday.successRate)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => onOpenSettings("usage")}
            >
              {t("usage.title")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  {t("dashboard.appsTitle", { defaultValue: "Apps" })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.appsDescription", {
                    defaultValue: "Visible app status and routing posture.",
                  })}
                </p>
              </div>
              {activeRow && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenProviders(activeRow.appId)}
                >
                  {t("provider.title", { defaultValue: "Providers" })}
                </Button>
              )}
            </div>
            <div className="divide-y divide-border rounded-md border">
              {overview.visibleApps.map((app) => (
                <button
                  key={app.appId}
                  type="button"
                  onClick={() => onOpenProviders(app.appId)}
                  className="flex w-full items-center justify-between gap-4 p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProviderIcon
                      icon={app.icon}
                      name={app.displayName}
                      size={22}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {app.displayName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {app.currentProviderName ||
                          t("provider.noProviders", {
                            defaultValue: "No providers",
                          })}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">
                      {t("dashboard.providerCount", {
                        count: app.providerCount,
                        defaultValue: `${app.providerCount} providers`,
                      })}
                    </Badge>
                    {app.supportsProxy && (
                      <Badge
                        variant={app.isTakeoverActive ? "default" : "outline"}
                        className={
                          app.isTakeoverActive
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : undefined
                        }
                      >
                        {app.isTakeoverActive
                          ? t("dashboard.takeoverOn", {
                              defaultValue: "Routed",
                            })
                          : t("dashboard.takeoverOff", {
                              defaultValue: "Direct",
                            })}
                      </Badge>
                    )}
                    {app.supportsFailover && app.failoverQueueSize > 0 && (
                      <Badge variant="outline">
                        {t("dashboard.failoverQueueSize", {
                          count: app.failoverQueueSize,
                          defaultValue: `${app.failoverQueueSize} queued`,
                        })}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {t("settings.authCenter.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.authDescription", {
                      defaultValue: "Managed accounts and provider bindings.",
                    })}
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <MetricTile
                  icon={Users}
                  label={t("dashboard.accounts", {
                    defaultValue: "Accounts",
                  })}
                  value={formatInt(authAccountCount)}
                />
                <MetricTile
                  icon={ShieldCheck}
                  label={t("dashboard.bindings", {
                    defaultValue: "Bindings",
                  })}
                  value={formatInt(boundAuthCount)}
                />
                <MetricTile
                  icon={AlertTriangle}
                  label={t("dashboard.orphans", {
                    defaultValue: "Orphans",
                  })}
                  value={formatInt(orphanAuthCount)}
                />
              </div>
              <div className="mt-4 space-y-2">
                {authOverview.map((item) => (
                  <div
                    key={item.provider}
                    className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">
                      {item.accountCount} / {item.boundProviderCount}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => onOpenSettings("auth")}
              >
                {t("settings.tabAuth", { defaultValue: "Auth" })}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

interface MetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function MetricTile({ icon: Icon, label, value }: MetricTileProps) {
  return (
    <div className="rounded-md border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}
