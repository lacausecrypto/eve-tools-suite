<p align="center"><a href="README.md">🇬🇧 English</a> · <b>🇫🇷 Français</b></p>

<h1 align="center">EVE Tools Suite</h1>

<p align="center">
  <strong>15 outils tiers pour EVE Online, dans une seule app desktop rapide.</strong><br>
  Fit, industrie, minage, marché, trading, intel, planification de skills &amp; plus — bilingue (EN/FR), conforme CCP, EULA-safe.
</p>

<p align="center">
  <a href="https://github.com/lacausecrypto/eve-tools-suite/releases/download/v0.1.0/EVE.Tools.Suite_0.1.0_x64-setup.exe">
    <img src="https://img.shields.io/badge/⬇%20Télécharger-Windows%20(.exe)-0078D6?style=for-the-badge&logo=windows11&logoColor=white" alt="Télécharger pour Windows">
  </a>
  &nbsp;
  <a href="https://github.com/lacausecrypto/eve-tools-suite/releases/download/v0.1.0/EVE.Tools.Suite_0.1.0_aarch64.dmg">
    <img src="https://img.shields.io/badge/⬇%20Télécharger-macOS%20(.dmg)-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Télécharger pour macOS">
  </a>
</p>

<p align="center">
  <a href="https://github.com/lacausecrypto/eve-tools-suite/releases/latest"><img src="https://img.shields.io/github/v/release/lacausecrypto/eve-tools-suite?style=flat-square&color=success&label=version" alt="Dernière version"></a>
  <a href="https://github.com/lacausecrypto/eve-tools-suite/releases"><img src="https://img.shields.io/github/downloads/lacausecrypto/eve-tools-suite/total?style=flat-square&label=t%C3%A9l%C3%A9chargements" alt="Téléchargements"></a>
  <img src="https://img.shields.io/badge/plateforme-Windows%20%7C%20macOS-lightgrey?style=flat-square" alt="Plateforme">
  <img src="https://img.shields.io/badge/conçu%20avec-Tauri%202-24C8DB?style=flat-square&logo=tauri&logoColor=white" alt="Conçu avec Tauri">
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20FR-blue?style=flat-square" alt="Bilingue">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-MIT-green?style=flat-square" alt="Licence MIT"></a>
</p>

> 🔒 **EULA-safe par conception.** Aucun outil n'interagit avec le client EVE — pas d'injection, lecture mémoire, OCR ni automatisation d'entrées. On lit uniquement le texte que **tu** colles et on interroge les API **publiques** (ESI officielle, zKillboard). Scopes ESI en lecture seule, au plus juste.

---

## ⬇️ Téléchargement

**[→ Dernière version](https://github.com/lacausecrypto/eve-tools-suite/releases/latest)** — choisis ton fichier :

| OS | Fichier | Notes |
|---|---|---|
| **Windows** | `…_x64-setup.exe` | Windows 10/11 (64-bit) |
| **macOS (Apple Silicon)** | `…_aarch64.dmg` | M1/M2/M3 |

> Build macOS Intel à venir. En attendant, les Macs Intel peuvent compiler depuis les sources (voir plus bas).

- **Mises à jour automatiques** intégrées — une fois installée, l'app vérifie les nouvelles versions signées au démarrage et se met à jour en un clic.
- **Premier lancement :** l'app n'est pas encore signée au niveau OS, donc SmartScreen (« éditeur inconnu ») / Gatekeeper peuvent avertir. Choisis *Informations complémentaires → Exécuter quand même* (Windows) ou clic-droit → *Ouvrir* (macOS). Les mises à jour, elles, sont signées et vérifiées cryptographiquement.

---

## 🧰 Outils

15 modules plug-and-play sous un même shell. La plupart fonctionnent **sans login** (ESI publique) ; quelques-uns ajoutent un import SSO optionnel en lecture seule.

### 🏭 Industrie &amp; économie
| Outil | Description | Statut |
|---|---|---|
| **Industrie &amp; Coûts** | Coût de revient réel avec les vraies formules EVE (ME, EIV, install, surtaxe SCC), prix Jita en direct, carnet de jobs (ISK en prod, profit attendu vs réalisé), valorisation d'inventaire. | Bêta |
| **Retraitement &amp; Compression** | Rendements minerai → minéraux (skills/structure/implant) et **mix compressé optimal** pour le transport. | Bêta |
| **Simulateur PI** | Simulateur de Planetary Industry — layout, decay des extracteurs, équilibrage des chaînes, optimisation ISK/heure. | Bêta |
| **Gestion de Flotte Minière** | Sessions de minage en flotte, valorisation Jita, retraitement, et **répartition ISK** équitable entre membres. | Stable |

### 💹 Marché &amp; trading
| Outil | Description | Statut |
|---|---|---|
| **Explorateur de Marché** | Carnet multi-hubs (achat/vente), moyennes pondérées 5%, marge, spread, volumes, historique, watchlist. 100% ESI publique. | Bêta |
| **Copilote de Trading** | Où gagner de l'ISK : scanner **station-trading** région-wide (profit net/jour = marge × liquidité, frais &amp; taxe déduits) + **arbitrage** inter-hubs (profit/m³, ROI, sauts). | Bêta |
| **Estimateur de prix** | Estime n'importe quel collage — valeur Jita achat/vente, volume, EIV — sur tous les grands hubs. Un Evepraisal intégré. | Bêta |
| **Convertisseur LP** | ISK par point de loyauté — classe les meilleures offres des LP stores. | Bêta |

### ⚔️ Combat &amp; intel
| Outil | Description | Statut |
|---|---|---|
| **Atelier de Fit** | Colle un fit EFT pour l'analyser (EHP par profil de dégâts, stabilité cap, nav, DPS, stacking) — ou **génère** un fit auto depuis une coque + un rôle. | Bêta |
| **Analyseur de Pertes** | Post-mortem de killmail (lien zKill/ESI ou perso → dernière perte) : qui t'a tué, le gang, l'ISK, le fit, et *ce qui aurait sauvé le fit*. | Bêta |
| **L'Assistant du Pirate** | Intel local-chat pour le PvP solo &amp; small-gang — score de menace, prédiction de fit, réseau de gang, depuis zKill/ESI publics. | Bêta |
| **Estimateur Abyssal** | Qualité des rolls mutaplasmides vs plages théoriques (détection god-roll) + estimation de revente MutaMarket. | Bêta |

### 🎓 Progression &amp; apprentissage
| Outil | Description | Statut |
|---|---|---|
| **Optimiseur de Compétences** | Construis un plan d'entraînement (données CCP exactes), vois SP &amp; temps, et obtiens le **remap d'attributs optimal** — implants et Alpha/Omega gérés. L'EVEMon léger. | Bêta |
| **Journal d'Activité** | Suivi ISK/heure — chrono de session, butin valorisé, taux de drop. Remplace l'Activity Tracker retiré du jeu. | Bêta |
| **Académie EVE** | Apprends New Eden en t'amusant : cursus structurés (navigation, combat, économie, vie en corp), quiz notés, glossaire, reconnaissance de coques &amp; flashcards à répétition espacée, XP/niveaux/badges. 100% hors-ligne. | Bêta |

---

## ✨ Pourquoi cette suite

- **Une app, 15 outils** — UI shadcn/Radix homogène, moteur partagé, bascule instantanée entre outils (espace à onglets).
- **Précis, pas approximatif** — vraies formules EVE (ME/EIV/SCC, rendements de retraitement, stacking penalties, prix en moyenne pondérée) validées sur les données SDE et couvertes par des tests.
- **Bilingue EN/FR**, commutable à chaud.
- **Fonctionne hors-ligne** pour les outils locaux/calcul (Académie, calculs de l'Atelier de Fit, Retraitement, scoring Abyssal).
- **Mise à jour automatique** avec des releases signées cryptographiquement.

## 🛡️ Confiance &amp; conformité

- **Client ESI conforme CCP** — User-Agent explicite avec contact, respect du quota d'erreurs et du cache `expires`, `datasource=tranquility`.
- **SSO sécurisé** — OAuth2 **PKCE** (client public, sans secret), JWT vérifié contre les **JWKS** de CCP (signature + émetteur + audience + expiration). Les refresh tokens restent dans le **trousseau de l'OS** ; les access tokens n'atteignent jamais le frontend.
- **Scopes au plus juste** — lecture seule, demandés uniquement à l'usage d'une fonction authentifiée.
- **Vie privée** — statistiques d'usage anonymes et **opt-in** (désactivées par défaut, hébergées en UE, sans PII ni donnée EVE). Notice complète : **[PRIVACY.md](PRIVACY.md)**.

## 🛠️ Compiler depuis les sources

Nécessite Node 20+ et la [toolchain Rust](https://www.rust-lang.org/tools/install) (pour le build desktop).

```bash
npm install
npm run tauri:dev     # lance l'app desktop (Tauri + backend Rust)
npm run tauri:build   # produit les installeurs (.exe / .dmg)
npm test              # tests unitaires (Vitest)
```

`npm run dev` lance l'UI seule dans un navigateur (ESI publique uniquement) pour itérer vite.

**Stack :** React 18 · Vite · TypeScript · Tailwind + shadcn/ui · Zustand · **Tauri 2** (backend Rust) · persistance SQLite.

## 📜 Licence &amp; attribution

EVE Online et le logo EVE sont des marques déposées de CCP hf. Tous les éléments liés à EVE sont la propriété de CCP hf. Cette application est un outil tiers, **non affilié ni approuvé par CCP hf.**
