/**
 * Analyse de l'entrée utilisateur du Loss Analyzer — **pur et testable**.
 *
 * Formes acceptées :
 *  - lien ESI killmail        `…/killmails/<id>/<hash>/`         → { esi, id, hash }
 *  - lien zKillboard          `https://zkillboard.com/kill/<id>/` → { id }
 *  - id + hash collés         `<id>/<hash>` ou `<id>:<hash>`     → { esi, id, hash }
 *  - id de killmail nu        `123456789`                       → { id }
 *  - sinon                    n'importe quel texte              → { name }
 */

export type ParsedInput =
  | { kind: "esi"; id: number; hash: string }
  | { kind: "id"; id: number }
  | { kind: "name"; name: string };

/** Un hash de killmail ESI : 40 caractères hexadécimaux (sha1). */
const HASH_RE = /[a-f0-9]{40}/i;

/**
 * Classifie une entrée libre. Ne touche pas au réseau : un lien zKill ou un id
 * nu renvoie `{ kind: "id" }` (le hash sera résolu côté backend via zKill).
 */
export function parseInput(raw: string): ParsedInput | null {
  const text = raw.trim();
  if (!text) return null;

  // 1. Lien ESI : .../killmails/<id>/<hash>/
  const esiLink = text.match(/killmails\/(\d+)\/([a-f0-9]{40})/i);
  if (esiLink) {
    return { kind: "esi", id: Number(esiLink[1]), hash: esiLink[2].toLowerCase() };
  }

  // 2. Lien zKillboard : .../kill/<id>/
  const zkillLink = text.match(/zkillboard\.com\/kill\/(\d+)/i);
  if (zkillLink) {
    return { kind: "id", id: Number(zkillLink[1]) };
  }

  // 3. id + hash collés (séparés par / : ou espace).
  const idHash = text.match(/^(\d{4,})\s*[/:\s]\s*([a-f0-9]{40})$/i);
  if (idHash) {
    return { kind: "esi", id: Number(idHash[1]), hash: idHash[2].toLowerCase() };
  }

  // 4. id de killmail nu (uniquement des chiffres, longueur plausible).
  if (/^\d{4,}$/.test(text)) {
    return { kind: "id", id: Number(text) };
  }

  // 5. Un hash seul est inexploitable sans id → on l'écarte explicitement.
  if (HASH_RE.test(text) && /^[a-f0-9]+$/i.test(text)) {
    return null;
  }

  // 6. Sinon : un nom de personnage (le backend tentera de le résoudre).
  return { kind: "name", name: text };
}
