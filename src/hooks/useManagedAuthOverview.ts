import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  authGetStatus,
  type ManagedAuthProvider,
  type ManagedAuthStatus,
} from "@/lib/api/auth";
import { getProvidersQueryOptions } from "@/lib/query";
import { APP_IDS } from "@/config/appCapabilities";
import type { Provider } from "@/types";

export interface ManagedAuthProviderOverview {
  provider: ManagedAuthProvider;
  label: string;
  status?: ManagedAuthStatus;
  accountCount: number;
  defaultAccountId: string | null;
  boundProviderCount: number;
  orphanBindingCount: number;
  isLoading: boolean;
  error: unknown;
}

const MANAGED_AUTH_PROVIDERS: Array<{
  provider: ManagedAuthProvider;
  label: string;
}> = [
  { provider: "github_copilot", label: "GitHub Copilot" },
  { provider: "codex_oauth", label: "ChatGPT" },
];

const getManagedBindingAccountId = (
  provider: Provider,
  authProvider: ManagedAuthProvider,
): string | null => {
  const binding = provider.meta?.authBinding;
  if (
    binding?.source === "managed_account" &&
    binding.authProvider === authProvider
  ) {
    return binding.accountId ?? null;
  }

  if (authProvider === "github_copilot" && provider.meta?.githubAccountId) {
    return provider.meta.githubAccountId;
  }

  return null;
};

export function useManagedAuthOverview(): ManagedAuthProviderOverview[] {
  const statusQueries = useQueries({
    queries: MANAGED_AUTH_PROVIDERS.map(({ provider }) => ({
      queryKey: ["managed-auth-status", provider],
      queryFn: () => authGetStatus(provider),
      staleTime: 30_000,
    })),
  });
  const providerQueries = useQueries({
    queries: APP_IDS.map((appId) => getProvidersQueryOptions(appId)),
  });

  return useMemo(
    () =>
      MANAGED_AUTH_PROVIDERS.map(({ provider, label }, index) => {
        const statusQuery = statusQueries[index];
        const hasAccountSnapshot = Boolean(statusQuery.data);
        const accountIds = new Set(
          statusQuery.data?.accounts.map((account) => account.id) ?? [],
        );
        let boundProviderCount = 0;
        let orphanBindingCount = 0;

        for (const providerQuery of providerQueries) {
          const providers = Object.values(providerQuery.data?.providers ?? {});
          for (const row of providers) {
            const accountId = getManagedBindingAccountId(row, provider);
            if (!accountId) continue;
            boundProviderCount += 1;
            if (hasAccountSnapshot && !accountIds.has(accountId)) {
              orphanBindingCount += 1;
            }
          }
        }

        return {
          provider,
          label,
          status: statusQuery.data,
          accountCount: statusQuery.data?.accounts.length ?? 0,
          defaultAccountId: statusQuery.data?.default_account_id ?? null,
          boundProviderCount,
          orphanBindingCount,
          isLoading:
            statusQuery.isLoading ||
            providerQueries.some((query) => query.isLoading),
          error: statusQuery.error,
        };
      }),
    [providerQueries, statusQueries],
  );
}
