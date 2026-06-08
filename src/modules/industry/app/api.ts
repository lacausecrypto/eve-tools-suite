/**
 * Import ESI **authentifié** (jobs d'industrie, actifs, wallet) — câblé dans
 * l'UI (onglets Carnet & Actifs).
 *
 * Ces appels nécessitent un personnage connecté (SSO). En l'absence de login,
 * ils lèvent une erreur claire que l'UI rattrape — les flux publics
 * (calculateur, collage d'inventaire) restent pleinement fonctionnels sans login.
 *
 * Scopes requis : `esi-industry.read_character_jobs.v1`, `esi-assets.read_assets.v1`.
 */
import { esiGetAuth } from "@/core/esi/client";
import { track } from "@/core/analytics";
import type { WalletTx } from "./lib/fifo";

/** Codes d'activité d'industrie ESI. */
export const ACTIVITY_NAME: Record<number, string> = {
  1: "Fabrication",
  3: "Recherche TE",
  4: "Recherche ME",
  5: "Copie",
  8: "Invention",
  9: "Réaction",
  11: "Réaction",
};

export interface IndustryJob {
  job_id: number;
  activity_id: number;
  blueprint_type_id: number;
  product_type_id?: number;
  runs: number;
  cost?: number;
  status: string;
  start_date: string;
  end_date: string;
}

/** Jobs d'industrie d'un personnage (en cours, et terminés si demandé). */
export function fetchIndustryJobs(
  characterId: number,
  includeCompleted = false,
): Promise<IndustryJob[]> {
  track("industry_esi_import", { kind: "jobs" });
  return esiGetAuth<IndustryJob[]>(
    `/characters/${characterId}/industry/jobs/`,
    characterId,
    { include_completed: String(includeCompleted) },
  );
}

export interface AssetItem {
  item_id: number;
  type_id: number;
  quantity: number;
  location_id: number;
  location_flag: string;
  is_singleton: boolean;
}

const ESI_PAGE_SIZE = 1000;
const MAX_ASSET_PAGES = 25; // borne de sécurité (~25k lignes)

/**
 * Actifs d'un personnage, paginés. ESI renvoie 1000 lignes/page ; on s'arrête à
 * la première page courte (ou à la borne de sécurité).
 */
export async function fetchAssets(characterId: number): Promise<AssetItem[]> {
  track("industry_esi_import", { kind: "assets" });
  const all: AssetItem[] = [];
  for (let page = 1; page <= MAX_ASSET_PAGES; page++) {
    const batch = await esiGetAuth<AssetItem[]>(
      `/characters/${characterId}/assets/`,
      characterId,
      { page },
    );
    all.push(...batch);
    if (batch.length < ESI_PAGE_SIZE) break;
  }
  return all;
}

interface RawWalletTx {
  date: string;
  type_id: number;
  quantity: number;
  unit_price: number;
  is_buy: boolean;
}

/**
 * Transactions wallet d'un personnage (jusqu'aux ~2500 dernières) → base du
 * calcul de **coût réel FIFO**. Scope `esi-wallet.read_character_wallet.v1`.
 */
export async function fetchWalletTransactions(characterId: number): Promise<WalletTx[]> {
  track("industry_esi_import", { kind: "wallet" });
  const raw = await esiGetAuth<RawWalletTx[]>(
    `/characters/${characterId}/wallet/transactions/`,
    characterId,
  );
  return raw.map((r) => ({
    date: r.date,
    typeId: r.type_id,
    quantity: r.quantity,
    unitPrice: r.unit_price,
    isBuy: r.is_buy,
  }));
}
