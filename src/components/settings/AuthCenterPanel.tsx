import { AlertTriangle, Github, Link2, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { CodexIcon } from "@/components/BrandIcons";
import { CopilotAuthSection } from "@/components/providers/forms/CopilotAuthSection";
import { CodexOAuthSection } from "@/components/providers/forms/CodexOAuthSection";
import { useManagedAuthOverview } from "@/hooks/useManagedAuthOverview";
import type { LucideIcon } from "lucide-react";

export function AuthCenterPanel() {
  const { t } = useTranslation();
  const overview = useManagedAuthOverview();
  const accountCount = overview.reduce((sum, item) => sum + item.accountCount, 0);
  const bindingCount = overview.reduce(
    (sum, item) => sum + item.boundProviderCount,
    0,
  );
  const orphanCount = overview.reduce(
    (sum, item) => sum + item.orphanBindingCount,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">
                {t("settings.authCenter.title", {
                  defaultValue: "OAuth 认证中心",
                })}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("settings.authCenter.description", {
                defaultValue:
                  "在 Claude Code 中使用您的其他订阅，请注意合规风险。",
              })}
            </p>
          </div>
          <Badge variant="secondary">
            {t("settings.authCenter.beta", { defaultValue: "Beta" })}
          </Badge>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <OverviewTile
            icon={Users}
            label={t("settings.authCenter.accountCount", {
              defaultValue: "Accounts",
            })}
            value={accountCount.toLocaleString()}
          />
          <OverviewTile
            icon={Link2}
            label={t("settings.authCenter.bindingCount", {
              defaultValue: "Provider bindings",
            })}
            value={bindingCount.toLocaleString()}
          />
          <OverviewTile
            icon={AlertTriangle}
            label={t("settings.authCenter.orphanCount", {
              defaultValue: "Orphan bindings",
            })}
            value={orphanCount.toLocaleString()}
          />
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {overview.map((item) => (
            <div
              key={item.provider}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{item.label}</div>
                {item.status?.migration_error && (
                  <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                    {item.status.migration_error}
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>
                  {t("settings.authCenter.accountsAndBindings", {
                    accounts: item.accountCount,
                    bindings: item.boundProviderCount,
                    defaultValue: `${item.accountCount} accounts / ${item.boundProviderCount} bindings`,
                  })}
                </div>
                {item.orphanBindingCount > 0 && (
                  <div className="text-amber-600 dark:text-amber-400">
                    {t("settings.authCenter.orphanBindings", {
                      count: item.orphanBindingCount,
                      defaultValue: `${item.orphanBindingCount} orphan bindings`,
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Github className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-medium">GitHub Copilot</h4>
            <p className="text-sm text-muted-foreground">
              {t("settings.authCenter.copilotDescription", {
                defaultValue: "管理 GitHub Copilot 账号",
              })}
            </p>
          </div>
        </div>

        <CopilotAuthSection />
      </section>

      <section className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <CodexIcon size={20} />
          </div>
          <div>
            <h4 className="font-medium">ChatGPT (Codex OAuth)</h4>
            <p className="text-sm text-muted-foreground">
              {t("settings.authCenter.codexOauthDescription", {
                defaultValue: "管理 ChatGPT 账号",
              })}
            </p>
          </div>
        </div>

        <CodexOAuthSection />
      </section>
    </div>
  );
}

interface OverviewTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function OverviewTile({ icon: Icon, label, value }: OverviewTileProps) {
  return (
    <div className="rounded-md border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}
