import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useProxyStatus } from "@/hooks/useProxyStatus";
import { useUsageSummary } from "@/lib/query/usage";
import { getProvidersQueryOptions } from "@/lib/query";
import { failoverApi } from "@/lib/api/failover";
import {
  APP_IDS,
  VISIBLE_APP_DEFAULTS,
  appSupports,
  getAppCapability,
  getVisibleAppIds,
} from "@/config/appCapabilities";
import type { AppId } from "@/lib/api";
import type { VisibleApps } from "@/types";
import type { UsageRangeSelection } from "@/types/usage";

export interface DashboardAppOverview {
  appId: AppId;
  label: string;
  displayName: string;
  icon: string;
  providerCount: number;
  currentProviderName?: string;
  isTakeoverActive: boolean;
  activeProviderName?: string;
  failoverQueueSize: number;
  autoFailoverEnabled: boolean;
  supportsProxy: boolean;
  supportsFailover: boolean;
}

export interface DashboardOverview {
  proxyRunning: boolean;
  proxyAddress?: string;
  proxyPort?: number;
  activeConnections: number;
  totalRequests: number;
  successRate: number;
  failoverCount: number;
  lastError?: string | null;
  visibleApps: DashboardAppOverview[];
  usageToday: {
    totalRequests: number;
    totalCost: string;
    totalTokens: number;
    successRate: number;
    isLoading: boolean;
  };
  isLoading: boolean;
}

const TODAY_USAGE_RANGE: UsageRangeSelection = {
  preset: "today",
  liveEndTime: true,
};

export function useDashboardOverview(
  visibleApps: VisibleApps = VISIBLE_APP_DEFAULTS,
): DashboardOverview {
  const proxy = useProxyStatus();
  const providerQueries = useQueries({
    queries: APP_IDS.map((appId) =>
      getProvidersQueryOptions(appId, { isProxyRunning: proxy.isRunning }),
    ),
  });
  const failoverQueueQueries = useQueries({
    queries: APP_IDS.map((appId) => ({
      queryKey: ["failoverQueue", appId],
      queryFn: () => failoverApi.getFailoverQueue(appId),
      enabled: appSupports(appId, "failover"),
    })),
  });
  const autoFailoverQueries = useQueries({
    queries: APP_IDS.map((appId) => ({
      queryKey: ["autoFailoverEnabled", appId],
      queryFn: () => failoverApi.getAutoFailoverEnabled(appId),
      enabled: appSupports(appId, "failover"),
      placeholderData: false,
    })),
  });
  const usageSummary = useUsageSummary(TODAY_USAGE_RANGE, undefined, {
    refetchInterval: 30_000,
  });

  return useMemo(() => {
    const visibleAppIds = getVisibleAppIds(visibleApps);
    const status = proxy.status;

    const appRows = visibleAppIds.map((appId) => {
      const appIndex = APP_IDS.indexOf(appId);
      const capability = getAppCapability(appId);
      const providers = providerQueries[appIndex].data?.providers ?? {};
      const currentProviderId =
        providerQueries[appIndex].data?.currentProviderId ?? "";
      const activeTarget = status?.active_targets?.find(
        (target) => target.app_type === appId,
      );

      return {
        appId,
        label: capability.label,
        displayName: capability.displayName,
        icon: capability.icon,
        providerCount: Object.keys(providers).length,
        currentProviderName: currentProviderId
          ? providers[currentProviderId]?.name
          : undefined,
        isTakeoverActive: proxy.takeoverStatus?.[appId] ?? false,
        activeProviderName: activeTarget?.provider_name,
        failoverQueueSize:
          failoverQueueQueries[appIndex].data?.length ?? 0,
        autoFailoverEnabled: autoFailoverQueries[appIndex].data ?? false,
        supportsProxy: appSupports(appId, "proxyTakeover"),
        supportsFailover: appSupports(appId, "failover"),
      };
    });

    const summary = usageSummary.data;
    const totalTokens =
      (summary?.totalInputTokens ?? 0) +
      (summary?.totalOutputTokens ?? 0) +
      (summary?.totalCacheCreationTokens ?? 0) +
      (summary?.totalCacheReadTokens ?? 0);

    return {
      proxyRunning: proxy.isRunning,
      proxyAddress: status?.address,
      proxyPort: status?.port,
      activeConnections: status?.active_connections ?? 0,
      totalRequests: status?.total_requests ?? 0,
      successRate: status?.success_rate ?? 0,
      failoverCount: status?.failover_count ?? 0,
      lastError: status?.last_error,
      visibleApps: appRows,
      usageToday: {
        totalRequests: summary?.totalRequests ?? 0,
        totalCost: summary?.totalCost ?? "0",
        totalTokens,
        successRate: summary?.successRate ?? 0,
        isLoading: usageSummary.isLoading,
      },
      isLoading:
        proxy.isLoading ||
        providerQueries.some((query) => query.isLoading) ||
        failoverQueueQueries.some((query) => query.isLoading) ||
        autoFailoverQueries.some((query) => query.isLoading),
    };
  }, [
    autoFailoverQueries,
    failoverQueueQueries,
    providerQueries,
    proxy.isLoading,
    proxy.isRunning,
    proxy.status,
    proxy.takeoverStatus,
    usageSummary.data,
    usageSummary.isLoading,
    visibleApps,
  ]);
}
