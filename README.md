<p align="center"><b>🇬🇧 English</b> · <a href="README.fr.md">🇫🇷 Français</a></p>

<h1 align="center">EVE Tools Suite</h1>

<p align="center">
  <strong>15 third-party tools for EVE Online, in one fast desktop app.</strong><br>
  Fitting, industry, mining, market, trading, intel, skill planning &amp; more — bilingual (EN/FR), CCP-compliant, EULA-safe.
</p>

<p align="center">
  <a href="https://github.com/lacausecrypto/eve-tools-suite/releases/download/v0.1.0/EVE.Tools.Suite_0.1.0_x64-setup.exe">
    <img src="https://img.shields.io/badge/⬇%20Download-Windows%20(.exe)-0078D6?style=for-the-badge&logo=windows11&logoColor=white" alt="Download for Windows">
  </a>
  &nbsp;
  <a href="https://github.com/lacausecrypto/eve-tools-suite/releases/download/v0.1.0/EVE.Tools.Suite_0.1.0_aarch64.dmg">
    <img src="https://img.shields.io/badge/⬇%20Download-macOS%20(.dmg)-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS">
  </a>
</p>

<p align="center">
  <a href="https://github.com/lacausecrypto/eve-tools-suite/releases/latest"><img src="https://img.shields.io/github/v/release/lacausecrypto/eve-tools-suite?style=flat-square&color=success&label=latest" alt="Latest release"></a>
  <a href="https://github.com/lacausecrypto/eve-tools-suite/releases"><img src="https://img.shields.io/github/downloads/lacausecrypto/eve-tools-suite/total?style=flat-square&label=downloads" alt="Downloads"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/built%20with-Tauri%202-24C8DB?style=flat-square&logo=tauri&logoColor=white" alt="Built with Tauri">
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20FR-blue?style=flat-square" alt="Bilingual">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License"></a>
</p>

> 🔒 **EULA-safe by design.** No tool ever interacts with the EVE client — no injection, memory reading, OCR, or input automation. It only reads text **you** paste and queries **public** APIs (official ESI, zKillboard). Read-only ESI scopes, least privilege.

---

## ⬇️ Download

**[→ Get the latest release](https://github.com/lacausecrypto/eve-tools-suite/releases/latest)** — pick your file:

| OS | File | Notes |
|---|---|---|
| **Windows** | `…_x64-setup.exe` | Windows 10/11 (64-bit) |
| **macOS (Apple Silicon)** | `…_aarch64.dmg` | M1/M2/M3 |

> macOS Intel build coming soon. In the meantime, Intel Macs can build from source (see below).

- **Auto-updates** are built in — once installed, the app checks for new signed releases on launch and updates in one click.
- **First launch:** the app isn't OS-code-signed yet, so Windows SmartScreen ("unknown publisher") / macOS Gatekeeper may warn. Choose *More info → Run anyway* (Windows) or right-click → *Open* (macOS). Updates are cryptographically signed and verified regardless.

---

## 🧰 Tools

15 plug-and-play modules under one shell. Most work with **no login** (public ESI); a few add optional, read-only SSO import.

### 🏭 Industry &amp; economy
| Tool | What it does | Status |
|---|---|---|
| **Industry &amp; Cost Tracker** | Real production cost with EVE's true formulas (ME, EIV, install fee, SCC), live Jita prices, job ledger (ISK in production, expected vs realized profit), inventory valuation. | Beta |
| **Reprocessing &amp; Compression** | Ore → minerals yields (skills/structure/implant aware) and the **optimal compressed mix** for hauling. | Beta |
| **EVE PI Sim** | Planetary Industry simulator — layout, extractor decay, chain balancing, ISK/hour optimization. | Beta |
| **Mining Fleet Manager** | Fleet mining sessions, Jita valuation, reprocessing, and fair **ISK split** across members. | Stable |

### 💹 Market &amp; trade
| Tool | What it does | Status |
|---|---|---|
| **Market Browser** | Multi-hub order book (buy/sell), 5% weighted averages, margin, spread, volumes, history, watchlist. 100% public ESI. | Beta |
| **Trade Co-Pilot** | Where to make ISK: region-wide **station-trading** scanner (net profit/day = margin × liquidity, fees & tax in) + inter-hub **arbitrage** (profit/m³, ROI, jumps). | Beta |
| **Appraisal** | Appraise any paste — Jita buy/sell value, volume, EIV — across all major hubs. An in-app Evepraisal. | Beta |
| **LP Converter** | ISK per loyalty point — ranks the best LP-store deals for any corp. | Beta |

### ⚔️ Combat &amp; intel
| Tool | What it does | Status |
|---|---|---|
| **Fit Workshop** | Paste an EFT fit to analyze (EHP by damage profile, cap stability, nav, DPS, stacking) — or **auto-generate** a fit from a hull + role. | Beta |
| **Loss Analyzer** | Killmail post-mortem (zKill/ESI link or character → latest loss): who killed you, the gang, ISK, fit, and *what would have saved it*. | Beta |
| **Pirate's Big Helper** | Local-chat intel for solo &amp; small-gang PvP — threat scoring, fit prediction, gang network, all from public zKill/ESI. | Beta |
| **Abyssal Appraiser** | Mutaplasmid roll quality vs theoretical ranges (god-roll detection) + MutaMarket resale estimate. | Beta |

### 🎓 Progression &amp; learning
| Tool | What it does | Status |
|---|---|---|
| **Skill &amp; Remap Optimizer** | Build a training plan (exact CCP data), see SP &amp; time, and get the **optimal attribute remap** — implants and Alpha/Omega aware. The lightweight EVEMon. | Beta |
| **Activity Journal** | ISK/hour tracker — session timer, valued loot, drop rates. Replaces the removed in-game Activity Tracker. | Beta |
| **EVE Academy** | Learn New Eden the fun way: structured courses (navigation, combat, economy, corp life), graded quizzes, glossary, ship-recognition &amp; spaced-repetition drills, XP/levels/badges. 100% offline. | Beta |

---

## ✨ Why this suite

- **One app, 15 tools** — consistent shadcn/Radix UI, shared engine, instant tool switching (tabbed workspace).
- **Accurate, not hand-wavy** — real EVE formulas (ME/EIV/SCC, reprocessing yields, stacking penalties, weighted-average prices) validated against SDE data and unit-tested.
- **Bilingual EN/FR**, switchable live.
- **Works offline** for the local/compute tools (Academy, Fit Workshop math, Reprocessing, Abyssal scoring).
- **Auto-updating** with cryptographically signed releases.

## 🛡️ Trust &amp; compliance

- **CCP-compliant ESI client** — explicit User-Agent with contact, error-limit aware, respects `expires` caching, `datasource=tranquility`.
- **Secure SSO** — OAuth2 **PKCE** (public client, no secret), JWT verified against CCP **JWKS** (signature + issuer + audience + expiry). Refresh tokens live only in the **OS keychain**; access tokens never reach the frontend.
- **Least-privilege scopes** — read-only, requested only when you use an authenticated feature.
- **Privacy** — anonymous, **opt-in** usage analytics (off by default, EU-hosted, no PII, no EVE data). Full notice: **[PRIVACY.md](PRIVACY.md)**.

## 🛠️ Build from source

Requires Node 20+ and the [Rust toolchain](https://www.rust-lang.org/tools/install) (for the desktop build).

```bash
npm install
npm run tauri:dev     # run the desktop app (Tauri + Rust backend)
npm run tauri:build   # produce installers (.exe / .dmg)
npm test              # unit tests (Vitest)
```

`npm run dev` runs the UI alone in a browser (public ESI only) for fast iteration.

**Stack:** React 18 · Vite · TypeScript · Tailwind + shadcn/ui · Zustand · **Tauri 2** (Rust backend) · SQLite persistence.

## 📜 License &amp; attribution

EVE Online and the EVE logo are registered trademarks of CCP hf. All EVE-related materials are property of CCP hf. This application is a third-party tool, **not affiliated with or endorsed by CCP hf.**
