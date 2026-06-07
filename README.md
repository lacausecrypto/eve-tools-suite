# EVE Tools — Suite

Suite **modulaire** d'outils tiers pour **EVE Online**, façon Odoo : un shell unique
(lanceur d'apps) qui héberge des **modules-outils** indépendants, avec un design
**shadcn homogène** et un socle commun **conforme aux exigences CCP** (ESI, SSO, EULA).

> 🔒 **EULA-safe par conception.** Aucun outil n'interagit avec le client EVE
> (pas d'injection, lecture mémoire, OCR ni automatisation d'entrées). On lit
> uniquement le texte que **tu** colles et on interroge les API **publiques**
> (ESI officielle, zKillboard). Précédent : EveVision.

## Outils

| Outil | Description | Statut |
|---|---|---|
| **Mining Fleet Manager** | Sessions de minage en flotte, valorisation Jita, retraitement, paiements. | Stable |
| **Pirate's Big Helper** | Intel local-chat pour le PvP solo/small-gang (menace, zKill). | Bêta |
| **EVE PI Sim** | Simulateur de Planetary Industry (decay, équilibrage, ISK/heure). | Bêta |
| **EVE Academy** | École ludique pour New Eden : cursus structurés (navigation, combat, économie, vie en corp), quiz notés, glossaire, entraînement (reconnaissance des coques + flashcards à répétition espacée), XP/niveaux/badges/série. Intègre le Ship Recognition Trainer. 100 % hors-ligne. | Bêta |
| **Loss Analyzer** | Post-mortem de killmail (lien zKill/ESI ou pseudo → dernière perte) : qui t'a tué, gang, ISK, fit, « ce qui aurait sauvé le fit ». | Bêta |
| **Industry & Cost Tracker** | Coût de revient réel (formules EVE : ME, EIV, install, SCC), prix Jita publics, carnet de jobs (ISK en prod, profit attendu/réalisé), valorisation d'inventaire. | Bêta |
| **Market Browser** | Explorateur de marché multi-hubs (mieux qu'eve-tycoon) : carnet vendeurs/acheteurs, moyennes pondérées 5 %, marge, spread, volumes, sécurité par localisation, filtres, watchlist, historique. 100 % ESI publique. | Bêta |
| **Trade Co-Pilot** | Trouve où gagner de l'ISK : scanner station-trading (balayage région-wide → profit net/jour = marge × liquidité, frais & taxe déduits) + scanner d'arbitrage inter-hubs (profit/m³, ROI, sauts). Moteur de profit net configurable depuis les skills. 100 % ESI publique. | Bêta |

D'autres outils viendront — chacun est un **module** plug-and-play (voir
[`ARCHITECTURE.md`](ARCHITECTURE.md)). Le plan de chantier complet est dans
[`ROADMAP.md`](ROADMAP.md).

## Stack

- **Frontend** : React 18 + Vite + TypeScript + Tailwind + composants **shadcn/ui** (Radix).
- **Desktop** : **Tauri 2** (backend **Rust**) — léger, sûr ; trousseau OS pour les
  tokens ESI, proxy ESI avec User-Agent conforme.
- **Modules** : registre + manifeste (`src/core/module`), montés par le shell.

## Démarrer

```bash
npm install

# App web (dev, sans backend Rust — ESI en direct)
npm run dev          # http://localhost:5180

# Application desktop (Tauri + Rust : proxy ESI conforme, SSO, keychain)
npm run tauri:dev

# Build
npm run build        # frontend
npm run tauri:build  # installeurs desktop (.dmg / .exe / …)
```

> Le mode **web** sert au développement de l'UI. Le mode **desktop (Tauri)**
> active le socle conforme (User-Agent ESI, SSO PKCE, stockage sécurisé).

## Conformité CCP

La suite est pensée pour être **agréable à certifier** : voir
[`COMPLIANCE.md`](COMPLIANCE.md) (Developer License Agreement, ESI, SSO PKCE,
attribution, et la checklist d'enregistrement de l'application chez CCP).

## Licence & attribution

EVE Online et le logo EVE sont des marques déposées de CCP hf. Cette application
n'est ni affiliée ni approuvée par CCP hf.
