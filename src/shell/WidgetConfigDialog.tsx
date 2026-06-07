import { useDashboard, widgetByGid } from "@/core/dashboard";
import { useLocalized, useT } from "@/core/i18n";
import type { WidgetField } from "@/core/module/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Éditeur générique des données internes d'une instance de widget. */
export function WidgetConfigDialog({
  instanceId,
  onClose,
}: {
  instanceId: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const loc = useLocalized();
  const instances = useDashboard((s) => s.instances);
  const setConfig = useDashboard((s) => s.setConfig);

  const inst = instances.find((i) => i.id === instanceId) ?? null;
  const entry = inst ? widgetByGid(inst.gid) : null;
  const fields = entry?.widget.config ?? [];
  const open = !!inst && !!entry;

  if (!inst || !entry) return null;

  const update = (key: string, value: string | number | boolean) =>
    setConfig(inst.id, { ...inst.config, [key]: value });

  // Champ universel : tout widget est renommable.
  const titleField: WidgetField = {
    key: "title",
    label: { fr: "Titre", en: "Title" },
    type: "text",
    placeholder: loc(entry.widget.title),
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {entry.widget.icon && (
              <entry.widget.icon
                className="h-5 w-5"
                style={{ color: entry.owner.accent }}
              />
            )}
            {loc(entry.widget.title)}
          </DialogTitle>
          <DialogDescription>{t("board.configDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field
            field={titleField}
            value={inst.config[titleField.key]}
            onChange={update}
          />
          {fields.map((f) => (
            <Field key={f.key} field={f} value={inst.config[f.key]} onChange={update} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: WidgetField;
  value: string | number | boolean | undefined;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  const loc = useLocalized();
  const label = loc(field.label);

  if (field.type === "toggle")
    return (
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm">{label}</label>
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(v) => onChange(field.key, v)}
        />
      </div>
    );

  if (field.type === "select")
    return (
      <div>
        <label className="text-xs text-muted-foreground">{label}</label>
        <Select
          value={value != null ? String(value) : ""}
          onValueChange={(v) => onChange(field.key, v)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {loc(o.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );

  // text / number
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        type={field.type === "number" ? "number" : "text"}
        value={value != null ? String(value) : ""}
        placeholder={field.placeholder}
        onChange={(e) =>
          onChange(
            field.key,
            field.type === "number" ? parseFloat(e.target.value) : e.target.value,
          )
        }
        className="mt-1"
        spellCheck={false}
      />
    </div>
  );
}
