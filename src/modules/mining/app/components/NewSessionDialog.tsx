import { useState } from "react";
import { Rocket, Crown, Check, UserPlus } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@mining/components/ui/dialog";
import { Button } from "@mining/components/ui/button";
import { Input } from "@mining/components/ui/input";
import { cn } from "@mining/lib/utils";

export function NewSessionDialog({
  trigger,
  onLaunched,
}: {
  trigger: React.ReactNode;
  onLaunched?: () => void;
}) {
  const t = useT();
  const members = useStore((s) => s.members);
  const addMember = useStore((s) => s.addMember);
  const startSession = useStore((s) => s.startSession);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">(
    members.length > 0 ? "existing" : "new"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setMode(members.length > 0 ? "existing" : "new");
    setSelectedId(null);
    setNewName("");
    setError("");
  }

  function launch(withFc: boolean) {
    let fcMemberId: string | undefined;
    if (withFc) {
      if (mode === "new") {
        const name = newName.trim();
        if (!name) {
          setError(t("mining.new.err.enterName"));
          return;
        }
        const created = addMember(name);
        const member =
          created ??
          members.find((m) => m.name.toLowerCase() === name.toLowerCase());
        if (!member) {
          setError(t("mining.new.err.invalidName"));
          return;
        }
        fcMemberId = member.id;
      } else {
        if (!selectedId) {
          setError(t("mining.new.err.selectFc"));
          return;
        }
        fcMemberId = selectedId;
      }
    }
    startSession({ fcMemberId });
    setOpen(false);
    reset();
    onLaunched?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-fc" />
            {t("mining.new.title")}
          </DialogTitle>
          <DialogDescription>
            {t("mining.new.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
          {[
            { v: "existing" as const, label: t("mining.new.existingMember") },
            { v: "new" as const, label: t("mining.new.newPilot") },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => {
                setMode(opt.v);
                setError("");
              }}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === opt.v
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {mode === "existing" ? (
          members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("mining.new.emptyRoster")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-auto scrollbar-thin pr-1">
              {members.map((m) => {
                const on = selectedId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedId(m.id);
                      setError("");
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors text-left",
                      on
                        ? "border-fc bg-fc/10"
                        : "border-border bg-background/40 hover:bg-accent/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border shrink-0",
                        on
                          ? "bg-fc border-fc text-white"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{m.name}</span>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-1.5">
            <div className="relative">
              <UserPlus className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder={t("mining.new.fcPlaceholder")}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && launch(true)}
                className="pl-8"
              />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => launch(false)}>
            {t("mining.new.noFc")}
          </Button>
          <Button onClick={() => launch(true)}>
            <Rocket className="h-4 w-4" /> {t("mining.new.launch")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
