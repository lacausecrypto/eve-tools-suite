import { useMemo, useState } from "react";
import { Bell, Clock3, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "@/core/toast";
import { useT } from "@/core/i18n";
import { useWorkspace } from "@/core/workspace";
import { NOTIFICATION_EVENTS, NOTIFICATION_EVENT_BY_TYPE, NOTIFICATION_TEMPLATES } from "@/core/notifications/catalog";
import { useNotificationCenter } from "@/core/notifications/store";
import { evaluateNotificationRule } from "@/core/notifications/engine";
import type { ConditionOperator, NotificationCondition, NotificationRule } from "@/core/notifications/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import "./notificationMessages";

const OPERATORS: ConditionOperator[] = ["eq", "contains", "gt", "gte", "lt", "lte", "crossesAbove", "crossesBelow"];
const NUMBER_OPERATORS = OPERATORS.filter((operator) => operator !== "contains");
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function blankRule(): NotificationRule {
  return {
    id: makeId(), name: "", enabled: true, eventType: NOTIFICATION_EVENTS[0]?.type ?? "",
    conditions: [], cooldownMinutes: 5, onlyWhenHidden: true, createdAt: Date.now(),
  };
}

export function NotificationCenter() {
  const t = useT();
  const rules = useNotificationCenter((s) => s.rules);
  const history = useNotificationCenter((s) => s.history);
  const addRule = useNotificationCenter((s) => s.addRule);
  const updateRule = useNotificationCenter((s) => s.updateRule);
  const removeRule = useNotificationCenter((s) => s.removeRule);
  const [view, setView] = useState<"rules" | "history">("rules");
  const [draft, setDraft] = useState<NotificationRule | null>(null);
  const unread = useMemo(() => history.filter((item) => item.unread).length, [history]);

  const saveDraft = () => {
    if (!draft?.name.trim()) { toast.error(t("notifications.form.required")); return; }
    const exists = rules.some((rule) => rule.id === draft.id);
    if (exists) updateRule(draft.id, { ...draft, name: draft.name.trim() });
    else addRule({ ...draft, name: draft.name.trim() });
    setDraft(null);
  };

  const addTemplate = (templateId: string) => {
    const template = NOTIFICATION_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    addRule({ id: makeId(), createdAt: Date.now(), name: t(template.nameKey), ...template.rule });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary"><Bell className="size-5" /></div>
          <div><h1 className="text-2xl font-semibold">{t("notifications.title")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("notifications.subtitle")}</p></div>
        </div>
        <Button onClick={() => { setView("rules"); setDraft(blankRule()); }}><Plus className="mr-2 size-4" />{t("notifications.new")}</Button>
      </header>

      <div className="flex items-center gap-2 border-b border-border">
        <ViewButton active={view === "rules"} onClick={() => setView("rules")}>{t("notifications.rules")} <Badge variant="muted">{rules.length}</Badge></ViewButton>
        <ViewButton active={view === "history"} onClick={() => setView("history")}>{t("notifications.history")} {unread > 0 && <Badge variant="destructive">{unread}</Badge>}</ViewButton>
      </div>

      {view === "rules" ? (
        <div className="space-y-6">
          <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("notifications.templates")}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{NOTIFICATION_TEMPLATES.map((template) => (
              <button key={template.id} onClick={() => addTemplate(template.id)} className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/30">
                <div className="flex items-start justify-between gap-2"><strong className="text-sm">{t(template.nameKey)}</strong><Plus className="size-4 shrink-0 text-primary" /></div>
                <p className="mt-2 text-xs text-muted-foreground">{t(template.descriptionKey)}</p>
              </button>
            ))}</div>
          </section>
          {draft && <RuleEditor draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={() => setDraft(null)} />}
          <div className="space-y-3">{rules.length === 0 ? <Empty text={t("notifications.noRules")} /> : rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} onEdit={() => setDraft({ ...rule, conditions: rule.conditions.map((c) => ({ ...c })) })} onDelete={() => removeRule(rule.id)} />
          ))}</div>
        </div>
      ) : <HistoryView />}
    </div>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("flex items-center gap-2 border-b-2 px-3 py-2 text-sm", active ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}>{children}</button>;
}

function RuleCard({ rule, onEdit, onDelete }: { rule: NotificationRule; onEdit: () => void; onDelete: () => void }) {
  const t = useT();
  const updateRule = useNotificationCenter((s) => s.updateRule);
  const event = NOTIFICATION_EVENT_BY_TYPE.get(rule.eventType);
  return <Card><CardContent className="flex flex-wrap items-center gap-4 p-4">
    <Switch checked={rule.enabled} onCheckedChange={(enabled) => updateRule(rule.id, { enabled })} aria-label={t("notifications.enabled")} />
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm">{rule.name}</strong><Badge variant={rule.enabled ? "success" : "muted"}>{t(rule.enabled ? "notifications.enabled" : "notifications.disabled")}</Badge></div>
      <p className="mt-1 text-xs text-muted-foreground">{event ? t(event.labelKey) : rule.eventType} · {rule.conditions.length ? rule.conditions.map((c) => `${event?.fields.find((f) => f.key === c.field) ? t(event.fields.find((f) => f.key === c.field)!.labelKey) : c.field} ${t(`notifications.operator.${c.operator}`)} ${c.value}`).join(" · ") : t("notifications.form.noCondition")} · {rule.cooldownMinutes} min</p></div>
    <Button variant="ghost" size="icon" onClick={onEdit} title={t("notifications.edit")}><Pencil className="size-4" /></Button>
    <Button variant="ghost" size="icon" onClick={onDelete} title={t("notifications.delete")}><Trash2 className="size-4 text-destructive" /></Button>
  </CardContent></Card>;
}

function RuleEditor({ draft, setDraft, onSave, onCancel }: { draft: NotificationRule; setDraft: (rule: NotificationRule) => void; onSave: () => void; onCancel: () => void }) {
  const t = useT();
  const event = NOTIFICATION_EVENT_BY_TYPE.get(draft.eventType) ?? NOTIFICATION_EVENTS[0];
  const setEvent = (eventType: string) => setDraft({ ...draft, eventType, conditions: [] });
  const addCondition = () => { const field = event?.fields[0]; if (field) setDraft({ ...draft, conditions: [...draft.conditions, { field: field.key, operator: field.kind === "string" ? "contains" : "gte", value: field.kind === "number" ? 0 : "" }] }); };
  const updateCondition = (index: number, patch: Partial<NotificationCondition>) => setDraft({ ...draft, conditions: draft.conditions.map((condition, i) => i === index ? { ...condition, ...patch } : condition) });
  return <Card className="border-primary/30"><CardHeader className="flex-row items-center justify-between"><CardTitle>{t("notifications.new")}</CardTitle><Button variant="ghost" size="icon" onClick={onCancel}><X className="size-4" /></Button></CardHeader><CardContent className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2"><Field label={t("notifications.form.name")}><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label={t("notifications.form.event")}><Select value={draft.eventType} onValueChange={setEvent}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{NOTIFICATION_EVENTS.map((item) => <SelectItem key={item.type} value={item.type}>{t(item.labelKey)}</SelectItem>)}</SelectContent></Select></Field></div>
    <div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-medium">{t("notifications.form.conditions")}</label><Button variant="outline" size="sm" onClick={addCondition}><Plus className="mr-1 size-3" />{t("notifications.form.addCondition")}</Button></div>
      {draft.conditions.length === 0 && <p className="text-xs text-muted-foreground">{t("notifications.form.noCondition")}</p>}
      <div className="space-y-2">{draft.conditions.map((condition, index) => { const field = event?.fields.find((item) => item.key === condition.field) ?? event?.fields[0]; const operators = field?.kind === "number" ? NUMBER_OPERATORS : OPERATORS.slice(0, 2); return <div key={`${index}-${condition.field}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Select value={condition.field} onValueChange={(value) => { const next = event?.fields.find((item) => item.key === value); updateCondition(index, { field: value, operator: next?.kind === "number" ? "gte" : "contains", value: next?.kind === "number" ? 0 : "" }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{event?.fields.map((item) => <SelectItem key={item.key} value={item.key}>{t(item.labelKey)}</SelectItem>)}</SelectContent></Select>
        <Select value={condition.operator} onValueChange={(value) => updateCondition(index, { operator: value as ConditionOperator })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{operators.map((operator) => <SelectItem key={operator} value={operator}>{t(`notifications.operator.${operator}`)}</SelectItem>)}</SelectContent></Select>
        <Input type={field?.kind === "number" ? "number" : "text"} value={String(condition.value)} onChange={(e) => updateCondition(index, { value: field?.kind === "number" ? Number(e.target.value) : e.target.value })} placeholder={t("notifications.form.value")} />
        <Button variant="ghost" size="icon" onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_, i) => i !== index) })}><Trash2 className="size-4" /></Button>
      </div>; })}</div></div>
    <div className="grid gap-4 md:grid-cols-2"><Field label={t("notifications.form.cooldown")}><Input type="number" min={0} value={draft.cooldownMinutes} onChange={(e) => setDraft({ ...draft, cooldownMinutes: Math.max(0, Number(e.target.value)) })} /></Field><div className="flex items-end gap-3 pb-2"><Switch checked={draft.onlyWhenHidden} onCheckedChange={(onlyWhenHidden) => setDraft({ ...draft, onlyWhenHidden })} /><span className="text-sm">{t("notifications.form.hiddenOnly")}</span></div></div>
    <div className="grid gap-4 md:grid-cols-2"><Field label={t("notifications.form.title")}><Input value={draft.titleTemplate ?? ""} onChange={(e) => setDraft({ ...draft, titleTemplate: e.target.value || undefined })} /></Field><Field label={t("notifications.form.body")}><Textarea value={draft.bodyTemplate ?? ""} onChange={(e) => setDraft({ ...draft, bodyTemplate: e.target.value || undefined })} /></Field></div>
    <p className="text-xs text-muted-foreground">{t("notifications.form.templateHint")}</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel}>{t("notifications.form.cancel")}</Button><Button onClick={onSave}>{t("notifications.form.save")}</Button></div>
    <RulePreview rule={draft} />
  </CardContent></Card>;
}

function RulePreview({ rule }: { rule: NotificationRule }) {
  const t = useT();
  const event = useNotificationCenter((state) => state.lastEvents[rule.eventType]);
  if (!event) return <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground"><strong className="mb-1 block text-foreground">{t("notifications.preview.title")}</strong>{t("notifications.preview.none")}</div>;
  const evaluation = evaluateNotificationRule(rule, event);
  return <div className="rounded-lg border border-border bg-background/40 p-3 text-xs"><div className="flex items-center justify-between gap-2"><strong>{t("notifications.preview.title")}</strong><Badge variant={evaluation.matched ? "success" : "muted"}>{t(evaluation.matched ? "notifications.preview.match" : "notifications.preview.noMatch")}</Badge></div>
    <div className="mt-2 space-y-1">{evaluation.details.length === 0 ? <span className="text-muted-foreground">{t("notifications.form.noCondition")}</span> : evaluation.details.map((detail, index) => <div key={`${detail.condition.field}-${index}`} className={detail.matched ? "text-success" : "text-destructive"}>{detail.matched ? "✓" : "×"} {detail.condition.field}: {String(detail.current)} {t(`notifications.operator.${detail.condition.operator}`)} {String(detail.condition.value)}{detail.previous !== undefined ? ` · ${t("notifications.preview.previous")}: ${String(detail.previous)}` : ""}</div>)}</div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1.5 text-sm font-medium"><span>{label}</span>{children}</label>; }

function HistoryView() {
  const t = useT(); const history = useNotificationCenter((s) => s.history); const markAllRead = useNotificationCenter((s) => s.markAllRead); const clearHistory = useNotificationCenter((s) => s.clearHistory); const openModule = useWorkspace((s) => s.openModule);
  return <div className="space-y-3"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={markAllRead}>{t("notifications.markRead")}</Button><Button variant="outline" size="sm" onClick={clearHistory}>{t("notifications.clearHistory")}</Button></div>
    {history.length === 0 ? <Empty text={t("notifications.noHistory")} /> : history.map((item) => <Card key={item.id} className={cn(item.unread && "border-primary/40")}><CardContent className="flex gap-3 p-4"><Clock3 className="mt-1 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{item.title}</strong><Badge variant={item.delivery === "sent" ? "success" : "muted"}>{t(`notifications.delivery.${item.delivery}`)}</Badge></div>{item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}{item.payload && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">{t("notifications.history.payload")}</summary><div className="mt-1 flex flex-wrap gap-1">{Object.entries(item.payload).map(([key, value]) => <Badge key={key} variant="outline">{key}: {String(value)}</Badge>)}</div></details>}<p className="mt-2 text-xs text-muted-foreground">{item.ruleName} · {new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(item.occurredAt)}</p></div>{item.contextTabId?.startsWith("m:") && <Button variant="ghost" size="sm" onClick={() => openModule(item.contextTabId!.slice(2))}><ExternalLink className="mr-1 size-3" />{t("notifications.open")}</Button>}</CardContent></Card>)}
  </div>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{text}</div>; }
