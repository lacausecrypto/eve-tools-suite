/**
 * Logger local minimal (diagnostic dev). **Ne journalise jamais de secrets** :
 * les champs sensibles (tokens, code OAuth, verifier) sont masqués avant sortie.
 * Aucune télémétrie — tout reste dans la console locale.
 */
type Level = "debug" | "info" | "warn" | "error";

const SENSITIVE = /token|secret|code_verifier|^code$|password|authorization/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? "«redacted»" : redact(v);
    }
    return out;
  }
  return value;
}

function emit(level: Level, scope: string, msg: string, data?: unknown) {
  const prefix = `[${scope}]`;
  const payload = data === undefined ? [] : [redact(data)];
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](prefix, msg, ...payload);
}

/** Crée un logger préfixé pour un module ou un sous-système. */
export function logger(scope: string) {
  return {
    debug: (msg: string, data?: unknown) => emit("debug", scope, msg, data),
    info: (msg: string, data?: unknown) => emit("info", scope, msg, data),
    warn: (msg: string, data?: unknown) => emit("warn", scope, msg, data),
    error: (msg: string, data?: unknown) => emit("error", scope, msg, data),
  };
}
