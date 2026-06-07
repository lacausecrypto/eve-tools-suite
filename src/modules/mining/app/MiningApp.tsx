import { useMemo, useState } from "react";
import { Rocket, Users, History as HistoryIcon, Trophy } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import { useHydrated } from "@mining/hooks/useHydrated";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@mining/components/ui/tabs";
import { Button } from "@mining/components/ui/button";
import { Badge } from "@mining/components/ui/badge";
import { ActiveSession } from "@mining/components/ActiveSession";
import { MembersPanel } from "@mining/components/MembersPanel";
import { HistoryPanel } from "@mining/components/HistoryPanel";
import { Leaderboard } from "@mining/components/Leaderboard";
import { DataMenu } from "@mining/components/DataMenu";
import { NewSessionDialog } from "@mining/components/NewSessionDialog";

/**
 * Racine du module Mining sous le shell de la suite : on garde la navigation à
 * onglets, mais l'en-tête (marque) et le pied de page (attribution) sont fournis
 * par le shell — on ne les duplique pas ici.
 */
export function MiningApp() {
  const t = useT();
  const [tab, setTab] = useState("session");
  const sessions = useStore((s) => s.sessions);
  const members = useStore((s) => s.members);

  const hasActive = useMemo(
    () => sessions.some((s) => s.status === "active"),
    [sessions]
  );
  const endedCount = useMemo(
    () => sessions.filter((s) => s.status === "ended").length,
    [sessions]
  );
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <img
          src="/emblem.png"
          alt=""
          className="h-14 w-14 object-contain animate-pulse"
        />
        <p className="text-sm">{t("mining.loading")}</p>
      </div>
    );
  }

  return (
    <div data-tour="mining.root" className="mx-auto w-full max-w-6xl px-6 py-6 animate-fade-in">
      <div className="mb-3 flex items-center justify-end gap-2">
        {hasActive && (
          <Badge variant="success" className="hidden sm:inline-flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            {t("mining.session.inProgress")}
          </Badge>
        )}
        <DataMenu />
        <NewSessionDialog
          onLaunched={() => setTab("session")}
          trigger={
            <Button size="sm">
              <Rocket className="h-4 w-4" />
              <span className="hidden sm:inline">{t("mining.session.new")}</span>
            </Button>
          }
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-2">
          <TabsTrigger value="session">
            <Rocket className="h-4 w-4" /> {t("mining.tab.session")}
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4" /> {t("mining.tab.members")}
            {members.length > 0 && (
              <Badge variant="muted" className="ml-1">
                {members.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <HistoryIcon className="h-4 w-4" /> {t("mining.tab.history")}
            {endedCount > 0 && (
              <Badge variant="muted" className="ml-1">
                {endedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="h-4 w-4" /> Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="session">
          <ActiveSession />
        </TabsContent>
        <TabsContent value="members">
          <MembersPanel />
        </TabsContent>
        <TabsContent value="history">
          <HistoryPanel />
        </TabsContent>
        <TabsContent value="leaderboard">
          <Leaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
