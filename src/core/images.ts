/**
 * Service images EVE — CDN officiel `images.evetech.net` (chargé directement par
 * la webview, pas d'auth). Centralise les URLs pour rester cohérent entre outils.
 */
import { ENDPOINTS } from "@/core/app";

const BASE = ENDPOINTS.images;

/** Portrait d'un personnage. */
export const portraitUrl = (characterId: number, size = 64) =>
  `${BASE}/characters/${characterId}/portrait?size=${size}`;

/** Logo d'une corporation. */
export const corpLogoUrl = (corporationId: number, size = 32) =>
  `${BASE}/corporations/${corporationId}/logo?size=${size}`;

/** Logo d'une alliance. */
export const allianceLogoUrl = (allianceId: number, size = 32) =>
  `${BASE}/alliances/${allianceId}/logo?size=${size}`;

/** Icône d'un type (vaisseau, module, minerai…). */
export const typeIconUrl = (typeId: number, size = 32) =>
  `${BASE}/types/${typeId}/icon?size=${size}`;

/** Rendu 3D haute résolution d'une vaisseau. */
export const typeRenderUrl = (typeId: number, size = 256) =>
  `${BASE}/types/${typeId}/render?size=${size}`;

/** Logo d'une faction. */
export const factionLogoUrl = (factionId: number, size = 32) =>
  `${BASE}/corporations/${factionId}/logo?size=${size}`;
