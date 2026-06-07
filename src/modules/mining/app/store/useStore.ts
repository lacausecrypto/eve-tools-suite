import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// Persistance via le socle de la suite (M1) : SQLite en desktop (Tauri),
// localStorage en dev web — isolée dans le namespace « mining ».
import { namespacedStorage } from "@/core/storage/persist";
import { track } from "@/core/analytics";
import type {
  FleetEvent,
  LootEvent,
  Member,
  PayoutBasis,
  PayoutMode,
  PlayerGroup,
  Session,
  SessionMember,
  StockItem,
  ValuationForm,
} from "@mining/types";
import type { BeltType } from "@mining/data/ores";
import { computeBroadcastPresence } from "@mining/lib/presence";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

interface StoreState {
  members: Member[];
  playerGroups: PlayerGroup[];
  sessions: Session[];
  activeSessionId: string | null;

  // ── Roster corpo ──
  addMember: (name: string) => Member | null;
  renameMember: (id: string, name: string) => void;
  removeMember: (id: string) => void;

  // ── Groupes de joueurs (alts) ──
  createPlayerGroup: (memberIds: string[], name?: string) => string | null;
  renamePlayerGroup: (groupId: string, name: string) => void;
  addMemberToGroup: (groupId: string, memberId: string) => void;
  removeMemberFromGroup: (memberId: string) => void;
  deletePlayerGroup: (groupId: string) => void;

  // ── Sessions ──
  startSession: (input?: {
    name?: string;
    types?: BeltType[];
    memberIds?: string[];
    fcMemberId?: string;
  }) => string;
  toggleSessionType: (sessionId: string, type: BeltType) => void;
  endSession: (sessionId: string) => void;
  reopenSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  setSessionTotalIsk: (sessionId: string, isk: number) => void;
  setSessionNotes: (sessionId: string, notes: string) => void;
  incrementEvent: (sessionId: string, key: string, delta: number) => void;
  renameSession: (sessionId: string, name: string) => void;

  // ── Présence ──
  addParticipant: (sessionId: string, memberId: string) => void;
  toggleParticipantPresence: (sessionId: string, memberId: string) => void;
  removeParticipant: (sessionId: string, memberId: string) => void;
  setParticipantBarge: (
    sessionId: string,
    memberId: string,
    barge: string
  ) => void;
  setParticipantScout: (
    sessionId: string,
    memberId: string,
    scout: boolean
  ) => void;
  setParticipantFc: (
    sessionId: string,
    memberId: string,
    fc: boolean
  ) => void;
  setScoutPct: (sessionId: string, pct: number) => void;
  setFcPct: (sessionId: string, pct: number) => void;

  // ── Belts (par type de gisement) ──
  incrementBeltType: (sessionId: string, type: BeltType, delta: number) => void;

  // ── Récoltes (Diffusions) ──
  addLootEvents: (sessionId: string, events: LootEvent[]) => number;
  /** Ajoute des entrées/sorties de flotte (déduplique par signature). */
  addFleetEvents: (sessionId: string, events: FleetEvent[]) => number;
  /** Crée au besoin les membres trouvés dans les Diffusions et les ajoute à la session. */
  syncMinersToRoster: (
    sessionId: string,
    minerNames: string[]
  ) => { newMembers: number; newParticipants: number };
  /** Recalcule la présence des mineurs depuis les horodatages des Diffusions. */
  applyBroadcastPresence: (sessionId: string) => void;
  clearLoot: (sessionId: string) => void;
  /** Corrige une récolte (quantité / nom du mineur). */
  updateLootEvent: (
    sessionId: string,
    sig: string,
    patch: { miner?: string; qty?: number }
  ) => void;
  /** Supprime une récolte. */
  removeLootEvent: (sessionId: string, sig: string) => void;
  setOrePrice: (sessionId: string, ore: string, price: number) => void;
  setOrePrices: (sessionId: string, prices: Record<string, number>) => void;
  setPayoutMode: (sessionId: string, mode: PayoutMode) => void;
  setValuationForm: (sessionId: string, form: ValuationForm) => void;
  setBuybackPct: (sessionId: string, pct: number) => void;
  setIskOverride: (sessionId: string, value: number) => void;
  togglePaid: (sessionId: string, playerKey: string) => void;

  // ── Stock de consommables ──
  setStock: (sessionId: string, items: StockItem[]) => void;
  /** Ajoute au stock (cumule les quantités par objet, réappro). */
  addStock: (sessionId: string, items: StockItem[]) => void;
  /** Déduit du stock (soustrait les quantités, retire l'objet à 0). */
  subtractStock: (sessionId: string, items: StockItem[]) => void;
  clearStock: (sessionId: string) => void;
  setStockPrice: (sessionId: string, name: string, price: number) => void;
  setStockPrices: (sessionId: string, prices: Record<string, number>) => void;
  setRefinePct: (sessionId: string, pct: number) => void;
  setPayoutBasis: (sessionId: string, basis: PayoutBasis) => void;
  /** Corrige la quantité d'une ligne de stock. */
  updateStockItem: (sessionId: string, name: string, qty: number) => void;
  /** Supprime une ligne de stock. */
  removeStockItem: (sessionId: string, name: string) => void;

  // ── Données ──
  importState: (data: Partial<StoreSnapshot>) => void;
  resetAll: () => void;
}

interface StoreSnapshot {
  members: Member[];
  playerGroups: PlayerGroup[];
  sessions: Session[];
  activeSessionId: string | null;
}

function mutateSession(
  sessions: Session[],
  id: string,
  fn: (s: Session) => Session
): Session[] {
  return sessions.map((s) => (s.id === id ? fn(s) : s));
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      members: [],
      playerGroups: [],
      sessions: [],
      activeSessionId: null,

      addMember: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const exists = get().members.some(
          (m) => m.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) return null;
        const member: Member = {
          id: uid(),
          name: trimmed,
          createdAt: Date.now(),
        };
        set((st) => ({ members: [...st.members, member] }));
        return member;
      },

      renameMember: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((st) => ({
          members: st.members.map((m) =>
            m.id === id ? { ...m, name: trimmed } : m
          ),
        }));
      },

      removeMember: (id) =>
        set((st) => ({
          members: st.members.filter((m) => m.id !== id),
          // retire le membre des groupes ; dissout les groupes < 2 membres
          playerGroups: st.playerGroups
            .map((g) => ({
              ...g,
              memberIds: g.memberIds.filter((mid) => mid !== id),
            }))
            .filter((g) => g.memberIds.length >= 2),
        })),

      createPlayerGroup: (memberIds, name) => {
        const ids = [...new Set(memberIds)];
        if (ids.length < 2) return null;
        const roster = get().members;
        const first = roster.find((m) => m.id === ids[0]);
        const groupId = uid();
        // un membre n'appartient qu'à un seul groupe : on le retire des autres
        set((st) => ({
          playerGroups: [
            ...st.playerGroups
              .map((g) => ({
                ...g,
                memberIds: g.memberIds.filter((mid) => !ids.includes(mid)),
              }))
              .filter((g) => g.memberIds.length >= 2),
            {
              id: groupId,
              name: (name && name.trim()) || first?.name || "Joueur",
              memberIds: ids,
            },
          ],
        }));
        return groupId;
      },

      renamePlayerGroup: (groupId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((st) => ({
          playerGroups: st.playerGroups.map((g) =>
            g.id === groupId ? { ...g, name: trimmed } : g
          ),
        }));
      },

      addMemberToGroup: (groupId, memberId) =>
        set((st) => ({
          playerGroups: st.playerGroups
            .map((g) => {
              if (g.id === groupId) {
                return g.memberIds.includes(memberId)
                  ? g
                  : { ...g, memberIds: [...g.memberIds, memberId] };
              }
              // retire le membre de tout autre groupe
              return {
                ...g,
                memberIds: g.memberIds.filter((mid) => mid !== memberId),
              };
            })
            .filter((g) => g.memberIds.length >= 2),
        })),

      removeMemberFromGroup: (memberId) =>
        set((st) => ({
          playerGroups: st.playerGroups
            .map((g) => ({
              ...g,
              memberIds: g.memberIds.filter((mid) => mid !== memberId),
            }))
            .filter((g) => g.memberIds.length >= 2),
        })),

      deletePlayerGroup: (groupId) =>
        set((st) => ({
          playerGroups: st.playerGroups.filter((g) => g.id !== groupId),
        })),

      startSession: (input = {}) => {
        const {
          name = "",
          types = ["standard"],
          memberIds = [],
          fcMemberId,
        } = input;
        track("mining_session_started", { members: memberIds.length });
        const now = Date.now();
        const roster = get().members;
        const allIds = fcMemberId
          ? [fcMemberId, ...memberIds.filter((id) => id !== fcMemberId)]
          : memberIds;
        const members: SessionMember[] = allIds
          .map((mid) => roster.find((m) => m.id === mid))
          .filter((m): m is Member => !!m)
          .map((m) => ({
            memberId: m.id,
            name: m.name,
            intervals: [{ joinedAt: now, leftAt: null }],
            fc: m.id === fcMemberId,
          }));
        const num = get().sessions.length + 1;
        const autoName = `Session #${num} · ${new Date(now).toLocaleDateString(
          "fr-FR"
        )}`;
        const session: Session = {
          id: uid(),
          name: name.trim() || autoName,
          types: types.length ? types : ["standard"],
          status: "active",
          startedAt: now,
          endedAt: null,
          members,
          beltCounts: {},
          ores: [],
          totalIsk: 0,
          notes: "",
          lootEvents: [],
          orePrices: {},
          payoutMode: "presence",
          valuationForm: "raw",
          buybackPct: 100,
          scoutPct: 10,
          fcPct: 5,
          iskOverride: 0,
          paidPlayers: [],
          events: {},
          stock: [],
          stockPrices: {},
          refinePct: 100,
        };
        set((st) => ({
          sessions: [session, ...st.sessions],
          activeSessionId: session.id,
        }));
        return session.id;
      },

      toggleSessionType: (sessionId, type) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            const has = s.types.includes(type);
            const next = has
              ? s.types.filter((t) => t !== type)
              : [...s.types, type];
            return { ...s, types: next };
          }),
        })),

      endSession: (sessionId) => {
        const now = Date.now();
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            status: "ended",
            endedAt: now,
            members: s.members.map((m) => ({
              ...m,
              intervals: m.intervals.map((iv) =>
                iv.leftAt === null ? { ...iv, leftAt: now } : iv
              ),
            })),
          })),
        }));
      },

      reopenSession: (sessionId) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            status: "active",
            endedAt: null,
          })),
          activeSessionId: sessionId,
        })),

      deleteSession: (sessionId) =>
        set((st) => ({
          sessions: st.sessions.filter((s) => s.id !== sessionId),
          activeSessionId:
            st.activeSessionId === sessionId ? null : st.activeSessionId,
        })),

      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

      setSessionTotalIsk: (sessionId, isk) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            totalIsk: Math.max(0, isk),
          })),
        })),

      setSessionNotes: (sessionId, notes) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            notes,
          })),
        })),

      incrementEvent: (sessionId, key, delta) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            const cur = (s.events ?? {})[key] ?? 0;
            const next = Math.max(0, cur + delta);
            const events = { ...(s.events ?? {}) };
            if (next === 0) delete events[key];
            else events[key] = next;
            return { ...s, events };
          }),
        })),

      renameSession: (sessionId, name) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            name: name.trim() || s.name,
          })),
        })),

      addParticipant: (sessionId, memberId) => {
        const now = Date.now();
        const roster = get().members;
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            if (s.members.some((m) => m.memberId === memberId)) return s;
            const member = roster.find((m) => m.id === memberId);
            if (!member) return s;
            return {
              ...s,
              members: [
                ...s.members,
                {
                  memberId: member.id,
                  name: member.name,
                  intervals: [{ joinedAt: now, leftAt: null }],
                },
              ],
            };
          }),
        }));
      },

      toggleParticipantPresence: (sessionId, memberId) => {
        const now = Date.now();
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            if (s.status !== "active") return s;
            return {
              ...s,
              members: s.members.map((m) => {
                if (m.memberId !== memberId) return m;
                const last = m.intervals[m.intervals.length - 1];
                if (last && last.leftAt === null) {
                  // présent → marquer absent
                  return {
                    ...m,
                    intervals: m.intervals.map((iv, i) =>
                      i === m.intervals.length - 1
                        ? { ...iv, leftAt: now }
                        : iv
                    ),
                  };
                }
                // absent → réactiver
                return {
                  ...m,
                  intervals: [...m.intervals, { joinedAt: now, leftAt: null }],
                };
              }),
            };
          }),
        }));
      },

      removeParticipant: (sessionId, memberId) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            members: s.members.filter((m) => m.memberId !== memberId),
          })),
        })),

      setParticipantBarge: (sessionId, memberId, barge) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            members: s.members.map((m) =>
              m.memberId === memberId ? { ...m, barge } : m
            ),
          })),
        })),

      setParticipantScout: (sessionId, memberId, scout) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            members: s.members.map((m) =>
              m.memberId === memberId ? { ...m, scout } : m
            ),
          })),
        })),

      setParticipantFc: (sessionId, memberId, fc) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            // un seul FC : on (dé)tague la cible et on retire le rôle aux autres
            members: s.members.map((m) =>
              m.memberId === memberId
                ? { ...m, fc }
                : fc
                ? { ...m, fc: false }
                : m
            ),
          })),
        })),

      setScoutPct: (sessionId, pct) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            scoutPct: Math.min(100, Math.max(0, pct)),
          })),
        })),

      setFcPct: (sessionId, pct) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            fcPct: Math.min(100, Math.max(0, pct)),
          })),
        })),

      incrementBeltType: (sessionId, type, delta) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            const cur = (s.beltCounts ?? {})[type] ?? 0;
            const next = Math.max(0, cur + delta);
            const beltCounts = { ...(s.beltCounts ?? {}) };
            if (next === 0) delete beltCounts[type];
            else beltCounts[type] = next;
            return { ...s, beltCounts };
          }),
        })),

      addLootEvents: (sessionId, events) => {
        let added = 0;
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            const existing = new Set((s.lootEvents ?? []).map((e) => e.sig));
            const fresh = events.filter((e) => !existing.has(e.sig));
            added = fresh.length;
            if (fresh.length === 0) return s;
            return { ...s, lootEvents: [...(s.lootEvents ?? []), ...fresh] };
          }),
        }));
        return added;
      },

      addFleetEvents: (sessionId, events) => {
        let added = 0;
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            const existing = new Set((s.fleetEvents ?? []).map((e) => e.sig));
            const fresh = events.filter((e) => !existing.has(e.sig));
            added = fresh.length;
            if (fresh.length === 0) return s;
            return { ...s, fleetEvents: [...(s.fleetEvents ?? []), ...fresh] };
          }),
        }));
        return added;
      },

      clearLoot: (sessionId) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            lootEvents: [],
            fleetEvents: [],
          })),
        })),

      updateLootEvent: (sessionId, sig, patch) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            lootEvents: (s.lootEvents ?? []).map((e) =>
              e.sig === sig
                ? {
                    ...e,
                    miner:
                      patch.miner !== undefined && patch.miner.trim()
                        ? patch.miner.trim()
                        : e.miner,
                    qty:
                      patch.qty !== undefined
                        ? Math.max(0, Math.round(patch.qty))
                        : e.qty,
                  }
                : e
            ),
          })),
        })),

      removeLootEvent: (sessionId, sig) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            lootEvents: (s.lootEvents ?? []).filter((e) => e.sig !== sig),
          })),
        })),

      syncMinersToRoster: (sessionId, minerNames) => {
        const now = Date.now();
        let newMembers = 0;
        let newParticipants = 0;
        set((st) => {
          const members = [...st.members];
          const byName = new Map(
            members.map((m) => [m.name.toLowerCase(), m])
          );
          // dédoublonne les noms (en gardant la 1re casse rencontrée)
          const uniq = new Map<string, string>();
          for (const raw of minerNames) {
            const name = raw.trim();
            if (name && !uniq.has(name.toLowerCase()))
              uniq.set(name.toLowerCase(), name);
          }
          for (const [key, name] of uniq) {
            if (!byName.has(key)) {
              const member: Member = { id: uid(), name, createdAt: now };
              members.push(member);
              byName.set(key, member);
              newMembers++;
            }
          }
          const sessions = mutateSession(st.sessions, sessionId, (s) => {
            const present = new Set(s.members.map((m) => m.memberId));
            const additions: SessionMember[] = [];
            for (const [key] of uniq) {
              const member = byName.get(key)!;
              if (!present.has(member.id)) {
                additions.push({
                  memberId: member.id,
                  name: member.name,
                  intervals: [{ joinedAt: now, leftAt: null }],
                });
                newParticipants++;
              }
            }
            return additions.length
              ? { ...s, members: [...s.members, ...additions] }
              : s;
          });
          return { members, sessions };
        });
        return { newMembers, newParticipants };
      },

      applyBroadcastPresence: (sessionId) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            members: computeBroadcastPresence(
              s.members,
              s.lootEvents ?? [],
              s.fleetEvents ?? [],
              s.startedAt,
              s.status === "active"
            ),
          })),
        })),

      setOrePrice: (sessionId, ore, price) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            orePrices: { ...(s.orePrices ?? {}), [ore]: Math.max(0, price) },
          })),
        })),

      setOrePrices: (sessionId, prices) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            orePrices: { ...(s.orePrices ?? {}), ...prices },
          })),
        })),

      setStock: (sessionId, items) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            stock: items,
          })),
        })),

      addStock: (sessionId, items) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            // Cumule par objet (clé minuscule), en gardant l'ordre existant
            // puis les nouveaux objets en fin de liste.
            const map = new Map(
              (s.stock ?? []).map((it) => [it.name.toLowerCase(), { ...it }])
            );
            const log = { ...(s.stockLog ?? {}) };
            for (const it of items) {
              const k = it.name.toLowerCase();
              const ex = map.get(k);
              if (ex) ex.qty += it.qty;
              else map.set(k, { name: it.name, qty: it.qty });
              const e = log[k] ?? { name: it.name, added: 0, removed: 0 };
              log[k] = { ...e, name: it.name, added: e.added + it.qty };
            }
            return { ...s, stock: [...map.values()], stockLog: log };
          }),
        })),

      subtractStock: (sessionId, items) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            const dec = new Map(
              items.map((it) => [it.name.toLowerCase(), it.qty])
            );
            const log = { ...(s.stockLog ?? {}) };
            const next = (s.stock ?? [])
              .map((it) => {
                const k = it.name.toLowerCase();
                const d = dec.get(k);
                if (!d) return it;
                const actual = Math.min(it.qty, d); // déduit réellement (plancher 0)
                if (actual > 0) {
                  const e = log[k] ?? { name: it.name, added: 0, removed: 0 };
                  log[k] = { ...e, name: it.name, removed: e.removed + actual };
                }
                return { ...it, qty: it.qty - actual };
              })
              .filter((it) => it.qty > 0); // objet épuisé → retiré du stock courant
            return { ...s, stock: next, stockLog: log };
          }),
        })),

      clearStock: (sessionId) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            stock: [],
            stockLog: {},
          })),
        })),

      setStockPrice: (sessionId, name, price) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            stockPrices: { ...(s.stockPrices ?? {}), [name]: Math.max(0, price) },
          })),
        })),

      setStockPrices: (sessionId, prices) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            stockPrices: { ...(s.stockPrices ?? {}), ...prices },
          })),
        })),

      setRefinePct: (sessionId, pct) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            refinePct: Math.max(0, Math.min(100, Math.round(pct * 10) / 10)),
          })),
        })),

      setPayoutBasis: (sessionId, basis) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            payoutBasis: basis,
          })),
        })),

      updateStockItem: (sessionId, name, qty) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            stock: (s.stock ?? []).map((it) =>
              it.name === name ? { ...it, qty: Math.max(0, Math.round(qty)) } : it
            ),
          })),
        })),

      removeStockItem: (sessionId, name) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            stock: (s.stock ?? []).filter((it) => it.name !== name),
          })),
        })),

      setPayoutMode: (sessionId, mode) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            payoutMode: mode,
          })),
        })),

      setValuationForm: (sessionId, form) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            valuationForm: form,
          })),
        })),

      setBuybackPct: (sessionId, pct) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            buybackPct: Math.min(100, Math.max(0, pct)),
          })),
        })),

      setIskOverride: (sessionId, value) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => ({
            ...s,
            iskOverride: Math.max(0, value),
          })),
        })),

      togglePaid: (sessionId, playerKey) =>
        set((st) => ({
          sessions: mutateSession(st.sessions, sessionId, (s) => {
            const paid = s.paidPlayers ?? [];
            return {
              ...s,
              paidPlayers: paid.includes(playerKey)
                ? paid.filter((k) => k !== playerKey)
                : [...paid, playerKey],
            };
          }),
        })),

      importState: (data) =>
        set((st) => ({
          members: data.members ?? st.members,
          playerGroups: data.playerGroups ?? st.playerGroups,
          sessions: data.sessions ?? st.sessions,
          activeSessionId:
            data.activeSessionId !== undefined
              ? data.activeSessionId
              : st.activeSessionId,
        })),

      resetAll: () =>
        set({
          members: [],
          playerGroups: [],
          sessions: [],
          activeSessionId: null,
        }),
    }),
    {
      name: "eve-mining-fleet-v1",
      version: 12,
      storage: createJSONStorage(() => namespacedStorage("mining")),
      migrate: (persisted) => {
        const state = persisted as StoreState;
        if (state && !state.playerGroups) state.playerGroups = [];
        if (state?.sessions) {
          state.sessions = state.sessions.map((s) => {
            const legacy = s as Session & { type?: BeltType };
            return {
              ...s,
              types:
                legacy.types ?? (legacy.type ? [legacy.type] : ["standard"]),
              lootEvents: s.lootEvents ?? [],
              orePrices: s.orePrices ?? {},
              payoutMode: s.payoutMode ?? "presence",
              valuationForm: s.valuationForm ?? "raw",
              buybackPct: s.buybackPct ?? 100,
              scoutPct: s.scoutPct ?? 10,
              fcPct: s.fcPct ?? 5,
              iskOverride: s.iskOverride ?? 0,
              paidPlayers: s.paidPlayers ?? [],
              events: s.events ?? {},
              beltCounts: s.beltCounts ?? {},
              stock: s.stock ?? [],
              stockPrices: s.stockPrices ?? {},
              refinePct: s.refinePct ?? 100,
            };
          });
        }
        return state;
      },
    }
  )
);
