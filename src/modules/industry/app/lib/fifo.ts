/**
 * Base de coût **réelle** (FIFO) depuis les transactions wallet — **pur**.
 *
 * C'est le cœur « EVE-Cost » : au lieu d'estimer au marché, on calcule ce que tu
 * as *vraiment* payé. On traite les achats comme des lots d'inventaire (premier
 * entré), les ventes consomment les lots les plus anciens. On obtient, par type :
 * le coût de base de l'inventaire restant et le profit **réalisé** sur les ventes.
 */

/** Une transaction wallet (sous-ensemble ESI utile). */
export interface WalletTx {
  date: string;
  typeId: number;
  quantity: number;
  unitPrice: number;
  isBuy: boolean;
}

/** Résultat FIFO pour un type. */
export interface CostBasis {
  typeId: number;
  /** Quantité encore en stock (achetée non revendue). */
  remainingQty: number;
  /** Coût total de base de l'inventaire restant. */
  remainingCost: number;
  /** Coût de base moyen unitaire de l'inventaire restant. */
  avgCost: number;
  /** Profit réalisé cumulé sur les ventes (vente − coût FIFO des unités vendues). */
  realizedProfit: number;
  /** Unités vendues (cumul). */
  soldQty: number;
}

interface Lot {
  qty: number;
  unit: number;
}

/**
 * Calcule la base de coût FIFO par type à partir d'une liste de transactions.
 * Les transactions sont triées par date croissante (anciennes d'abord) ; une
 * vente sans stock suffisant consomme ce qui existe (le reste est ignoré —
 * stock initial inconnu).
 */
export function fifoCostBasis(txns: WalletTx[]): Map<number, CostBasis> {
  const byType = new Map<number, WalletTx[]>();
  for (const tx of txns) {
    if (!byType.has(tx.typeId)) byType.set(tx.typeId, []);
    byType.get(tx.typeId)!.push(tx);
  }

  const out = new Map<number, CostBasis>();
  for (const [typeId, list] of byType) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const lots: Lot[] = [];
    let realizedProfit = 0;
    let soldQty = 0;

    for (const tx of sorted) {
      if (tx.isBuy) {
        lots.push({ qty: tx.quantity, unit: tx.unitPrice });
        continue;
      }
      // Vente : consomme les lots les plus anciens (FIFO).
      let remaining = tx.quantity;
      let cogs = 0;
      let consumed = 0;
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(remaining, lot.qty);
        cogs += take * lot.unit;
        consumed += take;
        lot.qty -= take;
        remaining -= take;
        if (lot.qty <= 0) lots.shift();
      }
      if (consumed > 0) {
        realizedProfit += tx.unitPrice * consumed - cogs;
        soldQty += consumed;
      }
    }

    const remainingQty = lots.reduce((s, l) => s + l.qty, 0);
    const remainingCost = lots.reduce((s, l) => s + l.qty * l.unit, 0);
    out.set(typeId, {
      typeId,
      remainingQty,
      remainingCost,
      avgCost: remainingQty > 0 ? remainingCost / remainingQty : 0,
      realizedProfit,
      soldQty,
    });
  }
  return out;
}
