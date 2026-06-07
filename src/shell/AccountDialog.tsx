import { useState } from "react";
import { Check, LogOut, Plus, ShieldCheck, UserCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccounts } from "@/core/account";
import { requiredScopes } from "@/core/module/registry";
import { sso } from "@/core/sso/session";
import { portraitUrl } from "@/core/images";
import { toast } from "@/core/toast";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";

/** Gestionnaire de comptes EVE : login/logout multi-personnages, perso actif. */
export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const sessions = useAccounts((s) => s.sessions);
  const activeId = useAccounts((s) => s.activeId);
  const loading = useAccounts((s) => s.loading);
  const login = useAccounts((s) => s.login);
  const logout = useAccounts((s) => s.logout);
  const setActive = useAccounts((s) => s.setActive);
  const [busy, setBusy] = useState(false);
  const t = useT();

  const available = sso.available();

  async function onLogin() {
    setBusy(true);
    try {
      // Demande l'union des scopes de tous les outils → un seul consentement
      // couvre skills (file + attributs), industry (jobs/actifs/wallet), etc.
      await login(requiredScopes());
      toast.success(t("account.toast.connected"));
    } catch (e) {
      toast.error(t("account.toast.failed"), String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onLogout(id: number, name: string) {
    await logout(id);
    toast.info(t("account.toast.disconnected"), name);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-fleur" /> {t("account.title")}
          </DialogTitle>
          <DialogDescription>{t("account.desc")}</DialogDescription>
        </DialogHeader>

        {!available ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {t("account.desktopOnly")}
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("account.none")}
              </p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => {
                  const isActive = s.characterId === activeId;
                  return (
                    <li
                      key={s.characterId}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                        isActive
                          ? "border-fleur/50 bg-fleur/10"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <img
                        className="size-9 rounded bg-muted"
                        src={portraitUrl(s.characterId, 64)}
                        alt=""
                        loading="lazy"
                      />
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setActive(s.characterId)}
                        title={t("account.setActive")}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {s.characterName || `id ${s.characterId}`}
                          </span>
                          {isActive && (
                            <Badge
                              variant="success"
                              className="gap-1 px-1.5 py-0 text-[10px]"
                            >
                              <Check className="size-3" /> {t("account.active")}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t(
                            s.scopes.length > 1
                              ? "account.scopes.many"
                              : "account.scopes.one",
                            { n: s.scopes.length },
                          )}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-red-400"
                        onClick={() =>
                          onLogout(s.characterId, s.characterName)
                        }
                        title={t("account.logout")}
                      >
                        <LogOut className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <Button
              onClick={onLogin}
              disabled={busy || loading}
              className="w-full"
            >
              <Plus className="size-4" />
              {busy ? t("account.adding") : t("account.add")}
            </Button>

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-fleur" />
              {t("account.note")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
