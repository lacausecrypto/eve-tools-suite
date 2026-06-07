// Événements de session cliquables (compteur cumulatif), repris dans le rapport.

export interface SessionEventType {
  key: string;
  label: string;
  icon: string;
}

export const SESSION_EVENTS: SessionEventType[] = [
  { key: "ganker", label: "Ganker / hostile", icon: "🛡️" },
  { key: "loss", label: "Vaisseau perdu", icon: "💀" },
  { key: "hauling", label: "Déchargement", icon: "📦" },
  { key: "resupply", label: "Réappro", icon: "⛽" },
  { key: "system", label: "Changement système", icon: "🚀" },
  { key: "belt", label: "Belt épuisé", icon: "🪨" },
  { key: "incident", label: "Alerte de sécurité", icon: "⚠️" },
  { key: "break", label: "Pause", icon: "☕" },
];

export const EVENT_BY_KEY: Record<string, SessionEventType> = Object.fromEntries(
  SESSION_EVENTS.map((e) => [e.key, e])
);
