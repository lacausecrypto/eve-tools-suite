import { useState } from "react";
import { Database, ShieldCheck, Trash2, Info, UserCircle2 } from "lucide-react";
import { useSettings } from "@/core/settings";
import { analyticsConfigured, setConsent } from "@/core/analytics";
import { usePrivacyDialog } from "@/shell/PrivacyDialog";
import { UpdaterControl } from "@/shell/UpdaterControl";
import { storage } from "@/core/storage";
import { listModules } from "@/core/module/registry";
import { esiErrorBudget } from "@/core/esi/client";
import { APP } from "@/core/app";
import { toast } from "@/core/toast";
import { useAccounts } from "@/core/account";
import { sso } from "@/core/sso/session";
import { ensureNotificationPermission } from "@/core/notify";
import { useT } from "@/core/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const selectCls =
  "h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Settings() {
  const s = useSettings();
  const t = useT();
  const accounts = useAccounts((a) => a.sessions);
  const [confirmWipe, setConfirmWipe] = useState(false);

  async function toggleNotifications(on: boolean) {
    if (on) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        toast.error(
          t("settings.notif.denied.title"),
          t("settings.notif.denied.body")
        );
        return;
      }
    }
    s.setNotifications(on);
  }

  async function wipe() {
    if (!confirmWipe) {
      setConfirmWipe(true);
      window.setTimeout(() => setConfirmWipe(false), 2500);
      return;
    }
    const st = storage();
    await Promise.all([
      st.namespace("shell").clear(),
      ...listModules().map((m) => st.namespace(m.id).clear()),
    ]);
    toast.success(t("settings.wipe.done.title"), t("settings.wipe.done.body"));
    setConfirmWipe(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8 animate-fade-in space-y-5">
      <h1 className="text-xl font-semibold">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.display")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Row label={t("settings.language")} hint={t("settings.language.hint")}>
            <select
              className={selectCls}
              value={s.language}
              onChange={(e) => s.setLanguage(e.target.value as "fr" | "en")}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Row>
          <Separator />
          <Row label={t("settings.hours")} hint={t("settings.hours.hint")}>
            <select
              className={selectCls}
              value={s.timeDisplay}
              onChange={(e) =>
                s.setTimeDisplay(e.target.value as "local" | "eve")
              }
            >
              <option value="local">{t("settings.hours.local")}</option>
              <option value="eve">{t("settings.hours.eve")}</option>
            </select>
          </Row>
          <Separator />
          <Row
            label={t("settings.reduceMotion")}
            hint={t("settings.reduceMotion.hint")}
          >
            <Switch
              checked={s.reduceMotion}
              onCheckedChange={s.setReduceMotion}
            />
          </Row>
          <Separator />
          <Row
            label={t("settings.notifications")}
            hint={
              sso.available()
                ? t("settings.notifications.hint.on")
                : t("settings.notifications.hint.off")
            }
          >
            <Switch
              checked={s.notifications}
              onCheckedChange={toggleNotifications}
              disabled={!sso.available()}
            />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-fleur" /> {t("settings.privacy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("settings.privacy.body")}
          </p>
          <Separator className="my-3" />
          <Row
            label={t("settings.analytics")}
            hint={
              analyticsConfigured()
                ? t("settings.analytics.hint")
                : t("settings.analytics.unconfigured")
            }
          >
            <Switch
              checked={s.analyticsConsent === "granted"}
              disabled={!analyticsConfigured()}
              onCheckedChange={(on) => setConsent(on ? "granted" : "denied")}
            />
          </Row>
          <Separator />
          <Row label={t("settings.privacyPolicy")} hint={t("settings.privacyPolicy.hint")}>
            <button
              onClick={() => usePrivacyDialog.getState().show()}
              className="text-xs text-fleur hover:underline"
            >
              {t("settings.privacyPolicy.open")}
            </button>
          </Row>
          <Separator />
          <Row
            label={t("settings.accounts")}
            hint={t("settings.accounts.hint")}
          >
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCircle2 className="h-3.5 w-3.5 text-fleur" />
              {accounts.length}
            </span>
          </Row>
          <Separator />
          <Row label={t("settings.storage")} hint={t("settings.storage.hint")}>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="h-3.5 w-3.5 text-fleur" />
              {storage().backend === "sqlite"
                ? t("settings.storage.sqlite")
                : t("settings.storage.web")}
            </span>
          </Row>
          <Separator />
          <Row
            label={t("settings.esiBudget")}
            hint={t("settings.esiBudget.hint")}
          >
            <span className="text-xs tabular-nums text-muted-foreground">
              {esiErrorBudget()} / 100
            </span>
          </Row>
          <Separator />
          <Row label={t("settings.wipe")} hint={t("settings.wipe.hint")}>
            <Button
              variant={confirmWipe ? "default" : "outline"}
              size="sm"
              className={confirmWipe ? "bg-destructive hover:bg-destructive/90" : ""}
              onClick={wipe}
            >
              <Trash2 className="h-4 w-4" />
              {confirmWipe ? t("settings.wipe.confirm") : t("settings.wipe.action")}
            </Button>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" /> {t("settings.about")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Row
            label={t("settings.update")}
            hint={t("settings.update.current", { v: APP.version })}
          >
            <UpdaterControl />
          </Row>
          <Separator />
          <Row label={APP.name} hint={t("settings.about.version", { v: APP.version })}>
            <a
              href={APP.repository}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-fleur hover:underline"
            >
              {t("settings.about.repo")}
            </a>
          </Row>
          <p className="text-[10px] leading-relaxed text-muted-foreground/60">
            {t("footer.attribution")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
