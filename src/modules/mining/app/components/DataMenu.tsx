import { useRef } from "react";
import { Download, Upload, Trash2, Database } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import { triggerDownload } from "@mining/lib/report";
import { Button } from "@mining/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@mining/components/ui/dropdown-menu";

export function DataMenu() {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const members = useStore((s) => s.members);
  const playerGroups = useStore((s) => s.playerGroups);
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const importState = useStore((s) => s.importState);
  const resetAll = useStore((s) => s.resetAll);

  function exportData() {
    const snapshot = {
      members,
      playerGroups,
      sessions,
      activeSessionId,
      version: 2,
    };
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(
      `eve-mining-backup-${date}.json`,
      JSON.stringify(snapshot, null, 2),
      "application/json"
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        importState({
          members: data.members,
          playerGroups: data.playerGroups,
          sessions: data.sessions,
          activeSessionId: data.activeSessionId ?? null,
        });
      } catch {
        alert(t("mining.data.invalidFile"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onFile}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Database className="h-4 w-4" /> {t("mining.data.button")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{t("mining.data.localBackup")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={exportData}>
            <Download className="h-4 w-4" /> {t("mining.data.export")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> {t("mining.data.import")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              if (window.confirm(t("mining.data.confirmClear"))) resetAll();
            }}
          >
            <Trash2 className="h-4 w-4" /> {t("mining.data.clearAll")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
