import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Users,
  Check,
  X,
  Link2,
  Unlink,
} from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@mining/components/ui/card";
import { Button } from "@mining/components/ui/button";
import { Input } from "@mining/components/ui/input";
import { Badge } from "@mining/components/ui/badge";
import { cn } from "@mining/lib/utils";

export function MembersPanel() {
  const t = useT();
  const members = useStore((s) => s.members);
  const playerGroups = useStore((s) => s.playerGroups);
  const sessions = useStore((s) => s.sessions);
  const addMember = useStore((s) => s.addMember);
  const removeMember = useStore((s) => s.removeMember);
  const renameMember = useStore((s) => s.renameMember);
  const createPlayerGroup = useStore((s) => s.createPlayerGroup);
  const renamePlayerGroup = useStore((s) => s.renamePlayerGroup);
  const removeMemberFromGroup = useStore((s) => s.removeMemberFromGroup);
  const deletePlayerGroup = useStore((s) => s.deletePlayerGroup);

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupEditName, setGroupEditName] = useState("");

  const groupOfMember = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const g of playerGroups)
      for (const mid of g.memberIds) map.set(mid, { id: g.id, name: g.name });
    return map;
  }, [playerGroups]);

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  function submit() {
    const created = addMember(name);
    if (!created) {
      setError(t("mining.members.nameEmptyOrDup"));
      return;
    }
    setName("");
    setError("");
  }

  function sessionsOf(memberId: string): number {
    return sessions.filter(
      (s) =>
        s.status === "ended" && s.members.some((m) => m.memberId === memberId)
    ).length;
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function regroup() {
    const ids = [...selected];
    if (ids.length < 2) return;
    createPlayerGroup(ids, groupName);
    setSelected(new Set());
    setGroupName("");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {t("mining.members.title")}
          <Badge variant="muted">{members.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={t("mining.members.placeholder")}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Button onClick={submit} className="shrink-0">
            <Plus className="h-4 w-4" /> {t("mining.members.add")}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Barre de regroupement */}
        {selected.size >= 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-primary" />
              {t("mining.members.selected", { n: selected.size })}
            </span>
            <Input
              placeholder={t("mining.members.groupNamePlaceholder")}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="h-8 flex-1"
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                onClick={regroup}
                disabled={selected.size < 2}
              >
                <Link2 className="h-4 w-4" /> {t("mining.members.regroup")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
              >
                {t("mining.members.cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* Groupes existants */}
        {playerGroups.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("mining.members.groupedAlts")}
            </div>
            {playerGroups.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border border-border/70 bg-background/40 p-2.5"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  {editingGroupId === g.id ? (
                    <>
                      <Input
                        autoFocus
                        value={groupEditName}
                        onChange={(e) => setGroupEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renamePlayerGroup(g.id, groupEditName);
                            setEditingGroupId(null);
                          }
                          if (e.key === "Escape") setEditingGroupId(null);
                        }}
                        className="h-7 flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-success"
                        onClick={() => {
                          renamePlayerGroup(g.id, groupEditName);
                          setEditingGroupId(null);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold flex-1 truncate">
                        {g.name}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        title={t("mining.members.renamePlayer")}
                        onClick={() => {
                          setEditingGroupId(g.id);
                          setGroupEditName(g.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title={t("mining.members.dissolveGroup")}
                        onClick={() => deletePlayerGroup(g.id)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {g.memberIds.map((mid) => {
                    const m = memberById.get(mid);
                    if (!m) return null;
                    return (
                      <Badge
                        key={mid}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {m.name}
                        <button
                          className="hover:text-destructive"
                          title={t("mining.members.removeFromGroup")}
                          onClick={() => removeMemberFromGroup(mid)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("mining.members.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
            {members.map((m) => {
              const grp = groupOfMember.get(m.id);
              const sel = selected.has(m.id);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40 transition-colors"
                >
                  {editingId === m.id ? (
                    <>
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renameMember(m.id, editName);
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-8"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-success"
                        onClick={() => {
                          renameMember(m.id, editName);
                          setEditingId(null);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleSelect(m.id)}
                        title={t("mining.members.selectToRegroup")}
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border shrink-0 transition-colors",
                          sel
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40 hover:border-primary"
                        )}
                      >
                        {sel && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium truncate">{m.name}</span>
                      {grp && (
                        <Badge variant="default" className="gap-1 shrink-0">
                          <Users className="h-3 w-3" /> {grp.name}
                        </Badge>
                      )}
                      <span className="flex-1" />
                      <Badge variant="muted" className="hidden sm:inline-flex">
                        {t("mining.members.sessionsCount", { n: sessionsOf(m.id) })}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => {
                          setEditingId(m.id);
                          setEditName(m.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember(m.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {members.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {t("mining.members.tip")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
