/**
 * Traductions du module **Atelier de Fit** (générateur + analyseur).
 * Enregistrées dans les dictionnaires partagés de la suite à l'import du module
 * (clés préfixées par `atelier.`). Jeu de clés identique en `fr` et `en`.
 */
import { registerMessages } from "@/core/i18n";

const fr = {
  // ── Onglets ──
  "atelier.tab.generate": "Générer",
  "atelier.tab.analyze": "Analyser",

  // ── GeneratorView — formulaire ──
  "atelier.need": "Besoin",
  "atelier.field.hull": "Coque",
  "atelier.field.role": "Rôle / activité",
  "atelier.field.tank": "Tank",
  "atelier.field.range": "Portée",
  "atelier.field.weapon": "Système d'arme",
  "atelier.hull.placeholder": "Ex. Vexor, Caracal, Gila…",
  "atelier.tank.auto": "Auto",
  "atelier.tank.armor": "Armure",
  "atelier.tank.shield": "Bouclier",
  "atelier.range.close": "Rapprochée",
  "atelier.range.long": "Longue",
  "atelier.weapon.auto": "Auto (selon la coque)",
  "atelier.weapon.hybrid": "Hybride (blaster/rail)",
  "atelier.weapon.projectile": "Projectile (AC/artillerie)",
  "atelier.weapon.laser": "Laser (pulse/beam)",
  "atelier.weapon.missile": "Missile",
  "atelier.weapon.drone": "Drones",
  "atelier.btn.generate": "Générer le fit",
  "atelier.gen.helper":
    "En mode Auto, l'arme et le tank suivent les bonus réels de la coque. Le générateur compose un fit T2 cohérent puis l'ajuste pour qu'il soit montable (CPU/grille). Options niveau V & profil de dégâts partagées avec l'onglet Analyser.",
  "atelier.gen.save": "Sauvegarder ce fit",
  "atelier.gen.copy": "Copier l'EFT",
  "atelier.gen.copied": "Copié",
  "atelier.gen.adjustments": "Ajustements :",
  "atelier.gen.loading": "Composition & ajustement du fit…",
  "atelier.saved.title": "Fits sauvegardés",
  "atelier.intro.gen":
    "Décris ton besoin (coque, rôle, tank, arme, portée) et obtiens un fit complet généré automatiquement : armes, tank, propulsion, rigs et drones, ajusté pour être montable. Analyse-le, copie l'EFT vers le jeu, sauvegarde-le.",
  "atelier.badge.roles": "8 rôles",
  "atelier.badge.weapons": "5 systèmes d'arme",
  "atelier.badge.fitable": "Montable garanti (CPU/grille)",

  // ── Rôles (générateur) ──
  "atelier.role.ratting": "Ratting / PvE (anneaux, poches)",
  "atelier.role.mission": "Missions (agents)",
  "atelier.role.abyssal": "Abyssal",
  "atelier.role.brawl": "PvP rapproché (brawl)",
  "atelier.role.kite": "PvP à distance (kite)",
  "atelier.role.tackle": "Tackle / interception",
  "atelier.role.mining": "Minage",
  "atelier.role.explore": "Exploration",

  // ── Noms de fit générés ──
  "atelier.fit.mining": "Auto · Minage",
  "atelier.fit.industrial": "Auto · Transport",
  "atelier.fit.role": "Auto · {role}",

  // ── Ajustements (mitigations) ──
  "atelier.mitig.lightenPlate": "Plaque allégée (variante restreinte)",
  "atelier.mitig.rcu": "Reactor Control Unit (grille) ajouté",
  "atelier.mitig.pgRig": "Rig de grille (ACR) ajouté",
  "atelier.mitig.coProcessor": "Co-Processor (CPU) ajouté",
  "atelier.mitig.cpuRig": "Rig de CPU (POU) ajouté",
  "atelier.mitig.rigRemoved": "Rig retiré (calibration)",

  // ── Erreurs ──
  "atelier.err.eftFormat": "Format EFT invalide : la première ligne doit être [Coque, Nom du fit].",
  "atelier.err.hullNotFound": "Coque introuvable : « {name} ».",
  "atelier.err.notAHull": "« {name} » n'est pas une coque exploitable.",
  "atelier.err.unsupported": "« {name} » n'est pas géré par le générateur (capital, navette ou coque spéciale).",
  "atelier.err.genOffline": "Génération indisponible hors application desktop (ESI direct bloqué par le navigateur en dev).",
  "atelier.err.analyzeOffline": "Analyse indisponible hors application desktop (ESI direct bloqué par le navigateur en dev).",

  // ── AnalyzerView ──
  "atelier.eft.title": "Fit EFT",
  "atelier.eft.placeholder": "[Coque, Nom du fit]\nModule…\nModule, Munition…\nDrone II x5",
  "atelier.btn.analyze": "Analyser",
  "atelier.btn.example": "Exemple",
  "atelier.btn.save": "Sauvegarder",
  "atelier.assumptions.title": "Hypothèses",
  "atelier.opt.skills": "Compétences & bonus de coque (niveau V)",
  "atelier.opt.skills.sub": "PV +25 % + bonus de traits (dégâts/résist)",
  "atelier.opt.profile": "Profil de dégâts (EHP effectif)",
  "atelier.analyze.loading": "Résolution des types & calcul…",
  "atelier.intro.analyze":
    "Colle un fit au format EFT (export du client EVE : clic droit sur un fit → Copier dans le presse-papier) puis Analyse. Tu obtiens EHP & résistances, condensateur (stabilité), navigation, encombrement (CPU/grille/calibration) et puissance de feu — 100 % ESI publique.",
  "atelier.badge.ehpProfile": "EHP par profil de dégâts",
  "atelier.badge.stacking": "Pénalités d'empilement",
  "atelier.badge.capStability": "Stabilité du cap",

  // ── Profils de dégâts ──
  "atelier.profile.omni": "Omni (équilibré)",
  "atelier.profile.guristas": "Guristas / Caldari (kin/th)",
  "atelier.profile.serpentis": "Serpentis / Gallente (kin/th)",
  "atelier.profile.angel": "Angel / Minmatar (exp/kin)",
  "atelier.profile.sansha": "Sansha / Amarr (em/th)",
  "atelier.profile.bloodraider": "Blood Raiders (em/th)",

  // ── AnalysisView — badges & en-tête ──
  "atelier.badge.notFitable": "Non montable",
  "atelier.badge.montable": "Montable",
  "atelier.badge.capStable": "Cap stable {pct} %",
  "atelier.badge.cap": "Cap {time}",
  "atelier.head.ehp": "EHP",
  "atelier.head.dps": "DPS",
  "atelier.head.volley": "Volée",
  "atelier.unresolved": "Non reconnus (ignorés) : {list}",

  // ── Panneaux ──
  "atelier.panel.tank": "Tank & résistances",
  "atelier.panel.cap": "Condensateur",
  "atelier.panel.nav": "Navigation",
  "atelier.panel.dps": "Puissance de feu",
  "atelier.panel.fitting": "Encombrement",

  // ── Couches de tank ──
  "atelier.layer.shield": "Bouclier",
  "atelier.layer.armor": "Armure",
  "atelier.layer.hull": "Structure",
  "atelier.unit.hp": "PV",
  "atelier.unit.ehp": "EHP",

  // ── Condensateur ──
  "atelier.stat.capacity": "Capacité",
  "atelier.stat.recharge": "Recharge",
  "atelier.stat.peakRecharge": "Pic de recharge",
  "atelier.stat.usage": "Consommation",
  "atelier.cap.stableAt": "Stable à {pct} %",
  "atelier.cap.unstable": "Instable — vidé en {time} (tous modules actifs)",

  // ── Navigation ──
  "atelier.nav.maxVel": "Vitesse max",
  "atelier.nav.alignTime": "Temps d'alignement",
  "atelier.nav.mass": "Masse",
  "atelier.nav.inertia": "Inertie",
  "atelier.nav.warpSpeed": "Vitesse warp",
  "atelier.nav.signature": "Signature",

  // ── Puissance de feu ──
  "atelier.dps.turrets": "Tourelles",
  "atelier.dps.missiles": "Missiles",
  "atelier.dps.drones": "Drones",
  "atelier.dmg.em": "EM",
  "atelier.dmg.th": "Therm",
  "atelier.dmg.kin": "Cin",
  "atelier.dmg.exp": "Explo",

  // ── Encombrement ──
  "atelier.fit.cpu": "CPU (tf)",
  "atelier.fit.grid": "Grille (MW)",
  "atelier.fit.calibration": "Calibration",
  "atelier.slot.high": "Haut",
  "atelier.slot.mid": "Moyen",
  "atelier.slot.low": "Bas",
  "atelier.slot.rig": "Rigs",
  "atelier.slot.turrets": "Tourelles",
  "atelier.slot.launchers": "Lanceurs",
  "atelier.slot.drones": "Drones {bw}/{maxBw} Mbit · {bay}/{maxBay} m³",

  // ── Hypothèses de calcul ──
  "atelier.assumptions.calcTitle": "Hypothèses de calcul",
  "atelier.assumption.skillsV": "Compétences niveau V appliquées : PV +25 % ; encombrement (CPU/grille +25 %, armes −25 %).",
  "atelier.assumption.skills0": "Compétences niveau 0 — CPU/grille bruts (un fit T2 paraîtra surchargé sans compétences).",
  "atelier.assumption.hullBonus": "Bonus de coque appliqués (niveau V) : {notes}.",
  "atelier.assumption.noHullBonus": "Bonus de rôle de coque non appliqués (coque non répertoriée ou option niveau V désactivée).",
  "atelier.assumption.dps": "DPS = volée × cadence × munition (bonus de coque inclus si répertoriés ; compétences d'arme non modélisées).",

  // ── Notes de bonus de coque (structurées) ──
  "atelier.note.dps": "+{pct} % dégâts {weapon}",
  "atelier.note.resist": "+{pct} % résist {layer}",
  "atelier.note.hp": "+{pct} % PV {layer}",
  "atelier.weapon.short.hybrid": "hybride",
  "atelier.weapon.short.projectile": "projectile",
  "atelier.weapon.short.laser": "laser",
  "atelier.weapon.short.missile": "missile",
  "atelier.weapon.short.drone": "drone",
  "atelier.layer.short.armor": "armure",
  "atelier.layer.short.shield": "bouclier",

  // ── Contrôles de cohérence (FitCheck) ──
  "atelier.check.overflow": "Le fit dépasse une ressource (CPU, grille, calibration ou slots) — il ne peut pas être monté tel quel.",
  "atelier.check.cpuOver": "CPU insuffisant : {used} / {total} tf.",
  "atelier.check.pgOver": "Grille insuffisante : {used} / {total} MW.",
  "atelier.check.calOver": "Calibration dépassée : {used} / {total}.",
  "atelier.check.hybridTank": "Tank hybride bouclier + armure détecté — généralement sous-optimal (rép. divisée).",
  "atelier.check.capUnstable": "Condensateur instable — vidé en {sec} s à pleine charge active.",
  "atelier.check.capStable": "Condensateur stable à {pct} %.",
  "atelier.check.noTank": "Aucun module de tank détecté.",
};

const en: Record<string, string> = {
  // ── Tabs ──
  "atelier.tab.generate": "Generate",
  "atelier.tab.analyze": "Analyze",

  // ── GeneratorView — form ──
  "atelier.need": "Need",
  "atelier.field.hull": "Hull",
  "atelier.field.role": "Role / activity",
  "atelier.field.tank": "Tank",
  "atelier.field.range": "Range",
  "atelier.field.weapon": "Weapon system",
  "atelier.hull.placeholder": "e.g. Vexor, Caracal, Gila…",
  "atelier.tank.auto": "Auto",
  "atelier.tank.armor": "Armor",
  "atelier.tank.shield": "Shield",
  "atelier.range.close": "Close",
  "atelier.range.long": "Long",
  "atelier.weapon.auto": "Auto (per hull)",
  "atelier.weapon.hybrid": "Hybrid (blaster/rail)",
  "atelier.weapon.projectile": "Projectile (AC/artillery)",
  "atelier.weapon.laser": "Laser (pulse/beam)",
  "atelier.weapon.missile": "Missile",
  "atelier.weapon.drone": "Drones",
  "atelier.btn.generate": "Generate fit",
  "atelier.gen.helper":
    "In Auto mode, the weapon and tank follow the hull's real bonuses. The generator builds a coherent T2 fit then adjusts it to be fittable (CPU/grid). Level V options & damage profile shared with the Analyze tab.",
  "atelier.gen.save": "Save this fit",
  "atelier.gen.copy": "Copy EFT",
  "atelier.gen.copied": "Copied",
  "atelier.gen.adjustments": "Adjustments:",
  "atelier.gen.loading": "Composing & adjusting the fit…",
  "atelier.saved.title": "Saved fits",
  "atelier.intro.gen":
    "Describe your need (hull, role, tank, weapon, range) and get a complete, auto-generated fit: weapons, tank, propulsion, rigs and drones, adjusted to be fittable. Analyze it, copy the EFT to the game, save it.",
  "atelier.badge.roles": "8 roles",
  "atelier.badge.weapons": "5 weapon systems",
  "atelier.badge.fitable": "Guaranteed fittable (CPU/grid)",

  // ── Roles (generator) ──
  "atelier.role.ratting": "Ratting / PvE (belts, pockets)",
  "atelier.role.mission": "Missions (agents)",
  "atelier.role.abyssal": "Abyssal",
  "atelier.role.brawl": "Close-range PvP (brawl)",
  "atelier.role.kite": "Ranged PvP (kite)",
  "atelier.role.tackle": "Tackle / interception",
  "atelier.role.mining": "Mining",
  "atelier.role.explore": "Exploration",

  // ── Generated fit names ──
  "atelier.fit.mining": "Auto · Mining",
  "atelier.fit.industrial": "Auto · Hauling",
  "atelier.fit.role": "Auto · {role}",

  // ── Adjustments (mitigations) ──
  "atelier.mitig.lightenPlate": "Plate lightened (restricted variant)",
  "atelier.mitig.rcu": "Reactor Control Unit (grid) added",
  "atelier.mitig.pgRig": "Grid rig (ACR) added",
  "atelier.mitig.coProcessor": "Co-Processor (CPU) added",
  "atelier.mitig.cpuRig": "CPU rig (POU) added",
  "atelier.mitig.rigRemoved": "Rig removed (calibration)",

  // ── Errors ──
  "atelier.err.eftFormat": "Invalid EFT format: the first line must be [Hull, Fit name].",
  "atelier.err.hullNotFound": "Hull not found: “{name}”.",
  "atelier.err.notAHull": "“{name}” is not a usable hull.",
  "atelier.err.unsupported": "“{name}” is not supported by the generator (capital, shuttle or special hull).",
  "atelier.err.genOffline": "Generation unavailable outside the desktop app (direct ESI blocked by the browser in dev).",
  "atelier.err.analyzeOffline": "Analysis unavailable outside the desktop app (direct ESI blocked by the browser in dev).",

  // ── AnalyzerView ──
  "atelier.eft.title": "EFT fit",
  "atelier.eft.placeholder": "[Hull, Fit name]\nModule…\nModule, Charge…\nDrone II x5",
  "atelier.btn.analyze": "Analyze",
  "atelier.btn.example": "Example",
  "atelier.btn.save": "Save",
  "atelier.assumptions.title": "Assumptions",
  "atelier.opt.skills": "Skills & hull bonuses (level V)",
  "atelier.opt.skills.sub": "HP +25% + trait bonuses (damage/resist)",
  "atelier.opt.profile": "Damage profile (effective EHP)",
  "atelier.analyze.loading": "Resolving types & computing…",
  "atelier.intro.analyze":
    "Paste an EFT-format fit (EVE client export: right-click a fit → Copy to clipboard) then Analyze. You get EHP & resistances, capacitor (stability), navigation, fitting (CPU/grid/calibration) and firepower — 100% public ESI.",
  "atelier.badge.ehpProfile": "EHP by damage profile",
  "atelier.badge.stacking": "Stacking penalties",
  "atelier.badge.capStability": "Cap stability",

  // ── Damage profiles ──
  "atelier.profile.omni": "Omni (balanced)",
  "atelier.profile.guristas": "Guristas / Caldari (kin/th)",
  "atelier.profile.serpentis": "Serpentis / Gallente (kin/th)",
  "atelier.profile.angel": "Angel / Minmatar (exp/kin)",
  "atelier.profile.sansha": "Sansha / Amarr (em/th)",
  "atelier.profile.bloodraider": "Blood Raiders (em/th)",

  // ── AnalysisView — badges & header ──
  "atelier.badge.notFitable": "Not fittable",
  "atelier.badge.montable": "Fittable",
  "atelier.badge.capStable": "Cap stable {pct}%",
  "atelier.badge.cap": "Cap {time}",
  "atelier.head.ehp": "EHP",
  "atelier.head.dps": "DPS",
  "atelier.head.volley": "Volley",
  "atelier.unresolved": "Unrecognized (ignored): {list}",

  // ── Panels ──
  "atelier.panel.tank": "Tank & resistances",
  "atelier.panel.cap": "Capacitor",
  "atelier.panel.nav": "Navigation",
  "atelier.panel.dps": "Firepower",
  "atelier.panel.fitting": "Fitting",

  // ── Tank layers ──
  "atelier.layer.shield": "Shield",
  "atelier.layer.armor": "Armor",
  "atelier.layer.hull": "Structure",
  "atelier.unit.hp": "HP",
  "atelier.unit.ehp": "EHP",

  // ── Capacitor ──
  "atelier.stat.capacity": "Capacity",
  "atelier.stat.recharge": "Recharge",
  "atelier.stat.peakRecharge": "Peak recharge",
  "atelier.stat.usage": "Usage",
  "atelier.cap.stableAt": "Stable at {pct}%",
  "atelier.cap.unstable": "Unstable — depleted in {time} (all modules active)",

  // ── Navigation ──
  "atelier.nav.maxVel": "Max velocity",
  "atelier.nav.alignTime": "Align time",
  "atelier.nav.mass": "Mass",
  "atelier.nav.inertia": "Inertia",
  "atelier.nav.warpSpeed": "Warp speed",
  "atelier.nav.signature": "Signature",

  // ── Firepower ──
  "atelier.dps.turrets": "Turrets",
  "atelier.dps.missiles": "Missiles",
  "atelier.dps.drones": "Drones",
  "atelier.dmg.em": "EM",
  "atelier.dmg.th": "Therm",
  "atelier.dmg.kin": "Kin",
  "atelier.dmg.exp": "Explo",

  // ── Fitting ──
  "atelier.fit.cpu": "CPU (tf)",
  "atelier.fit.grid": "Grid (MW)",
  "atelier.fit.calibration": "Calibration",
  "atelier.slot.high": "High",
  "atelier.slot.mid": "Mid",
  "atelier.slot.low": "Low",
  "atelier.slot.rig": "Rigs",
  "atelier.slot.turrets": "Turrets",
  "atelier.slot.launchers": "Launchers",
  "atelier.slot.drones": "Drones {bw}/{maxBw} Mbit · {bay}/{maxBay} m³",

  // ── Calculation assumptions ──
  "atelier.assumptions.calcTitle": "Calculation assumptions",
  "atelier.assumption.skillsV": "Level V skills applied: HP +25%; fitting (CPU/grid +25%, weapons −25%).",
  "atelier.assumption.skills0": "Level 0 skills — raw CPU/grid (a T2 fit will look overloaded without skills).",
  "atelier.assumption.hullBonus": "Hull bonuses applied (level V): {notes}.",
  "atelier.assumption.noHullBonus": "Hull role bonuses not applied (hull not listed or level V option disabled).",
  "atelier.assumption.dps": "DPS = volley × rate of fire × ammo (hull bonuses included if listed; weapon skills not modeled).",

  // ── Hull bonus notes (structured) ──
  "atelier.note.dps": "+{pct}% {weapon} damage",
  "atelier.note.resist": "+{pct}% {layer} resist",
  "atelier.note.hp": "+{pct}% {layer} HP",
  "atelier.weapon.short.hybrid": "hybrid",
  "atelier.weapon.short.projectile": "projectile",
  "atelier.weapon.short.laser": "laser",
  "atelier.weapon.short.missile": "missile",
  "atelier.weapon.short.drone": "drone",
  "atelier.layer.short.armor": "armor",
  "atelier.layer.short.shield": "shield",

  // ── Consistency checks (FitCheck) ──
  "atelier.check.overflow": "The fit exceeds a resource (CPU, grid, calibration or slots) — it can't be fitted as is.",
  "atelier.check.cpuOver": "Not enough CPU: {used} / {total} tf.",
  "atelier.check.pgOver": "Not enough grid: {used} / {total} MW.",
  "atelier.check.calOver": "Calibration exceeded: {used} / {total}.",
  "atelier.check.hybridTank": "Hybrid shield + armor tank detected — usually suboptimal (split repair).",
  "atelier.check.capUnstable": "Unstable capacitor — depleted in {sec} s at full active load.",
  "atelier.check.capStable": "Capacitor stable at {pct}%.",
  "atelier.check.noTank": "No tank module detected.",
};

registerMessages({ fr, en });
