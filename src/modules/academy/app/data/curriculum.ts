import { Brain, Coins, Crosshair, Globe2, Rocket, Settings2, Ship, Swords } from "lucide-react";
import type { Question, Track } from "../lib/types";

/**
 * Curriculum de l'EVE Academy — contenu pédagogique **statique et hors-ligne**.
 * Huit cursus du débutant à l'avancé ; chaque leçon expose son contenu (blocs) et
 * ses questions de quiz. Faits vérifiés (mécaniques de base d'EVE Online).
 */
export const TRACKS: Track[] = [
  // ───────────────────────────── 1. Premiers pas ─────────────────────────────
  {
    id: "premiers-pas",
    title: "Premiers pas",
    subtitle: "Capsule, compétences, navigation, sécurité, fitting",
    level: "Débutant",
    icon: Rocket,
    accent: "hsl(var(--primary))",
    lessons: [
      {
        id: "capsule",
        title: "La capsule & l'interface",
        summary: "Qui tu es dans New Eden, et comment lire ton écran.",
        minutes: 6,
        blocks: [
          { t: "p", text: "Tu es un capsuleer : un pilote quasi-immortel enfermé dans une capsule au cœur de son vaisseau. Quand la coque explose, tu t'éjectes en capsule (pod) ; si la capsule explose à son tour, ta conscience se réveille dans un nouveau clone à ta station médicale. Tu ne perds jamais tes compétences à la mort — seulement le vaisseau, son fit, sa cargaison, et les implants si tu es 'podé'." },
          { t: "h", text: "Les trois anneaux : ta vie" },
          { t: "ul", items: [
            "Bouclier (shield) : se régénère seul lentement ; première couche touchée.",
            "Armure (armor) : ne se régénère pas seule (sauf module/drone) ; deuxième couche.",
            "Structure (hull) : la coque elle-même ; à 0 %, tu exploses.",
          ] },
          { t: "h", text: "Repères d'interface" },
          { t: "ul", items: [
            "Overview : la liste filtrable de tout ce qui t'entoure (vaisseaux, stations, portes, astéroïdes, débris).",
            "Selected Item : actions sur la cible (approcher, orbiter, garder à distance, verrouiller).",
            "HUD central : capacitor (cercle intérieur) + les 3 anneaux de vie.",
            "Local : le chat du système — en k-space, il liste tous les pilotes présents (renseignement gratuit).",
            "Capacitor : ton 'énergie' ; alimente armes, modules actifs et propulsion.",
          ] },
          { t: "tip", text: "Configure ton Overview très tôt : crée un preset 'PvP' qui montre les vaisseaux/drones et masque le bruit (astéroïdes, structures). Un overview propre sauve des vies." },
          { t: "warn", text: "Sur ta capsule, tu n'as ni armes ni tank : si tu es podé, tu perds tes implants. Après une perte de vaisseau, warpe ta capsule immédiatement." },
        ],
        questions: [
          { q: "Que se passe-t-il à la mort de ta capsule ?", options: ["Tu perds toutes tes compétences", "Tu te réveilles dans un nouveau clone (et perds tes implants)", "Ton compte est supprimé", "Tu perds 50 % de ton ISK"], answer: 1, explain: "On ne perd plus de SP à la mort : tu réapparais dans ton clone médical, mais les implants installés sont détruits." },
          { q: "Quelle couche se régénère seule au fil du temps ?", options: ["La structure", "L'armure", "Le bouclier", "Le capacitor uniquement"], answer: 2 },
          { q: "À quoi sert l'Overview ?", options: ["Gérer le marché", "Lister et filtrer ce qui t'entoure", "Voir tes compétences", "Discuter avec ta corp"], answer: 1 },
        ],
      },
      {
        id: "competences",
        title: "Compétences & file d'attente",
        summary: "Le temps réel comme monnaie : la file de skills.",
        minutes: 6,
        blocks: [
          { t: "p", text: "Les compétences s'entraînent en temps réel, même hors-ligne, via une file d'attente que tu peux planifier sur des semaines. La vitesse dépend des attributs (Intelligence, Mémoire, Perception, Volonté, Charisme) sollicités par le skill, et des implants d'attribut." },
          { t: "ul", items: [
            "Chaque skill a 5 niveaux ; le passage au niveau V est long (souvent plusieurs jours).",
            "Le 'rang' (multiplicateur ×1 à ×16) indique la lenteur relative d'un skill.",
            "Un skill se mesure en SP (skill points) ; ~la moitié des SP d'un skill servent juste à atteindre le niveau IV — le V coûte autant que I→IV.",
            "Les prérequis : beaucoup de modules/vaisseaux exigent des skills support à un certain niveau.",
          ] },
          { t: "kv", title: "Où mettre ses premiers SP", rows: [
            ["Support cap/navigation", "Capacitor, Navigation, Warp Drive Operation — débloquent tout le reste."],
            ["Fitting", "CPU Management, Power Grid Management — pour monter des modules."],
            ["Cœur de spécialité", "Une race d'armes + une couche de tank, montées ensemble."],
          ] },
          { t: "tip", text: "Vise les niveaux IV partout avant de pousser un V : un IV bien réparti donne bien plus de puissance qu'un V isolé trop tôt." },
          { t: "warn", text: "Ne laisse jamais ta file de skills vide : c'est du temps d'entraînement perdu, ta ressource la plus précieuse." },
        ],
        questions: [
          { q: "Les compétences s'entraînent…", options: ["Seulement en ligne", "En temps réel, même déconnecté", "En tuant des PNJ", "En minant"], answer: 1 },
          { q: "Qu'accélèrent les implants d'attribut ?", options: ["Les dégâts", "La vitesse d'entraînement des skills", "Le warp", "Le minage"], answer: 1 },
          { q: "Stratégie d'entraînement recommandée au début ?", options: ["Monter un skill au V tout de suite", "Répartir des niveaux IV (support inclus)", "Ignorer les skills support", "N'entraîner que des armes"], answer: 1 },
        ],
      },
      {
        id: "navigation",
        title: "Naviguer : align, warp, AB/MWD",
        summary: "Te déplacer vite — et t'échapper.",
        minutes: 7,
        blocks: [
          { t: "p", text: "Pour entrer en warp, ton vaisseau doit s'aligner vers la destination puis atteindre 75 % de sa vitesse maximale. Le temps d'alignement dépend de la masse et de l'agilité (inertia modifier) : un interceptor s'aligne en ~2 s, un freighter en ~1 min." },
          { t: "h", text: "Distances & déplacement" },
          { t: "ul", items: [
            "Tu warpes d'un point à un autre ; en arrivant tu es à la distance choisie (0 à 100 km).",
            "Approach / Orbit / Keep at Range : les commandes de pilotage de base.",
            "1 UA ≈ 150 millions de km ; le warp se compte en UA, le combat en km.",
          ] },
          { t: "kv", title: "AB vs MWD", rows: [
            ["Afterburner (AB)", "Boost modéré (~+135 %), faible coût cap, n'augmente PAS la signature ; idéal contre le scram."],
            ["Microwarpdrive (MWD)", "+500 % env., gros coût cap, augmente la signature ~×5-6 (plus facile à toucher), coupé par un scram."],
          ] },
          { t: "tip", text: "Pour fuir : aligne-toi sur un objet (céleste/bookmark) et 'spamme' le bouton warp. Dès que tu n'es plus pointé et à 75 % de vitesse, tu pars." },
          { t: "warn", text: "Le 'bump' existe : un gros vaisseau peut te percuter pour t'empêcher de t'aligner. Et l'autopilot te dépose à 0 km des portes/stations… pile là où les gankers t'attendent." },
        ],
        questions: [
          { q: "À quelle fraction de la vitesse max entres-tu en warp ?", options: ["50 %", "75 %", "90 %", "100 %"], answer: 1 },
          { q: "Quel effet secondaire a le MWD ?", options: ["Réduit la signature", "Augmente fortement la signature", "Augmente l'armure", "Réduit le cap utilisé"], answer: 1, explain: "Le MWD gonfle la signature (~×5-6), te rendant plus facile à toucher — et un scram le désactive." },
          { q: "Pourquoi éviter l'autopilot en zone risquée ?", options: ["Il consomme du carburant", "Il te dépose à 0 km des portes/stations", "Il désactive le warp", "Il révèle ton fit"], answer: 1 },
        ],
      },
      {
        id: "securite",
        title: "Sécurité spatiale : hi-sec, low, null",
        summary: "Où CONCORD te protège — et où personne ne viendra.",
        minutes: 7,
        blocks: [
          { t: "kv", title: "Statut de sécurité du système", rows: [
            ["1.0 → 0.5 (High-sec)", "CONCORD punit toute agression non sanctionnée (mais arrive APRÈS les premiers dégâts)."],
            ["0.4 → 0.1 (Low-sec)", "Pas de CONCORD ; sentinelles de portes/stations seulement. PvP libre, statut suspect/criminel."],
            ["0.0 et moins (Null-sec)", "Aucune loi. Souveraineté, gros gangs, meilleurs revenus mais danger permanent."],
          ] },
          { t: "p", text: "Ton propre statut de sécurité (security status) baisse quand tu tires sur d'autres joueurs en low/null ; trop bas, les sentinelles et CONCORD te tirent dessus même en passant. On le remonte en tuant des rats ('tags' / ratting)." },
          { t: "warn", text: "CONCORD venge, il ne prévient pas. En high-sec, un ganker bien préparé te tue avant l'intervention si la valeur de ta cargaison dépasse le coût de ses vaisseaux. Ne transporte jamais une fortune dans un vaisseau fragile." },
          { t: "p", text: "Les wormholes (W-space) n'ont pas de Local peuplé : tu ne vois pas qui est là. Le d-scan devient ta seule alerte. C'est l'espace le plus dangereux… et parmi les plus rentables." },
          { t: "tip", text: "Apprends à lire le statut d'un système (couleur 1.0 vert → 0.0 rouge) avant de sauter. Un seul saut en low-sec change tout." },
        ],
        questions: [
          { q: "Dans quel espace CONCORD intervient-il ?", options: ["Null-sec", "Low-sec", "High-sec (0.5+)", "Wormholes"], answer: 2 },
          { q: "Pourquoi le high-sec n'est pas 100 % sûr ?", options: ["CONCORD venge mais n'empêche pas les premiers dégâts", "Il n'y a pas de CONCORD", "Les portes explosent", "Le warp est désactivé"], answer: 0 },
          { q: "Comment remonter un security status trop bas ?", options: ["Acheter au marché", "Tuer des rats (ratting / tags)", "Miner", "Attendre la maintenance"], answer: 1 },
        ],
      },
      {
        id: "fitting",
        title: "Le fitting : slots & capacitor",
        summary: "Équiper un vaisseau sans le rendre inutile.",
        minutes: 8,
        blocks: [
          { t: "kv", title: "Emplacements (slots)", rows: [
            ["Haut (high)", "Armes, et utilitaires (neut, smartbomb, mining laser, cloak)."],
            ["Médian (mid)", "Tank bouclier, propulsion (AB/MWD), tackle, EWAR, cap booster."],
            ["Bas (low)", "Tank armure, modules de dégâts, capacitor, agilité, extension de cargo."],
            ["Rigs", "3 améliorations permanentes (avec un malus, ex. -vitesse), liées au calibrage."],
          ] },
          { t: "p", text: "Chaque module consomme du CPU et de la PG (powergrid), budgétés par la coque. Si tu dépasses, le module ne s'active pas. Les modules existent en variantes : Tech I (bon marché), Tech II (meilleur, prérequis skills), Faction/Storyline, Deadspace/Officer (très chers)." },
          { t: "h", text: "Le capacitor" },
          { t: "ul", items: [
            "Il alimente armes actives, réparateurs, propulsion, EWAR.",
            "Un fit 'cap-stable' tient indéfiniment ; sinon tu as une durée avant panne sèche.",
            "Sans cap : plus de rep, plus de prop, plus de tackle — la mort.",
          ] },
          { t: "tip", text: "Règle d'or : tanke sur l'axe de ta coque (bonus). Bouclier → mids ; armure → lows. Mélanger les deux dilue ton EHP et gaspille des slots." },
          { t: "warn", text: "Évite de 'blinger' un vaisseau d'apprentissage : un fit T2 propre vaut mieux qu'un fit deadspace que tu perdras en apprenant. EFT/Pyfa permettent de simuler avant d'acheter." },
        ],
        questions: [
          { q: "Où monte-t-on typiquement le tank bouclier ?", options: ["Slots hauts", "Slots médians", "Slots bas", "Rigs"], answer: 1 },
          { q: "Que budgétise une coque pour ses modules ?", options: ["ISK et SP", "CPU et powergrid", "Warp et align", "EM et thermique"], answer: 1 },
          { q: "Que se passe-t-il quand ton capacitor tombe à zéro ?", options: ["Rien", "Modules actifs (rep, prop, tackle) s'arrêtent", "Tu gagnes de la vitesse", "Ton bouclier double"], answer: 1 },
        ],
      },
    ],
  },

  // ──────────────────────────── 2. Combat & survie ────────────────────────────
  {
    id: "combat-survie",
    title: "Combat & survie",
    subtitle: "Dégâts, tank, tackle, portée, EWAR, désengagement",
    level: "Intermédiaire",
    icon: Swords,
    accent: "hsl(var(--destructive))",
    lessons: [
      {
        id: "degats-resists",
        title: "Dégâts & résistances",
        summary: "Les 4 types de dégâts et les trous de résistance.",
        minutes: 7,
        blocks: [
          { t: "p", text: "Il existe quatre types de dégâts : EM, Thermique, Cinétique, Explosif. Chaque couche (bouclier/armure) a des résistances de base différentes. Connaître le 'trou' (la résistance la plus faible) te dit quelle munition choisir et où tu es vulnérable." },
          { t: "kv", title: "Résistances de base", rows: [
            ["Bouclier", "EM 0 % · Therm 20 % · Kin 40 % · Explo 50 % → trou = EM"],
            ["Armure", "EM 50 % · Therm 35 % · Kin 25 % · Explo 10 % → trou = Explosif"],
          ] },
          { t: "p", text: "Les races ont des profils de dégâts : Amarr = EM/Thermique (lasers), Caldari = Kinétique/Thermique (missiles/rails), Gallente = Thermique/Kinétique (blasters/drones), Minmatar = Explosif/tous (projectiles, munitions au choix)." },
          { t: "h", text: "Empilement de résistances (stacking)" },
          { t: "ul", items: [
            "Les modules de résistance subissent une pénalité d'empilement au-delà du 2e-3e identique.",
            "Mieux vaut combler le trou que sur-empiler une résistance déjà haute.",
            "Les résistances sont multiplicatives : passer de 50 % à 75 % double l'EHP sur ce type." ,
          ] },
          { t: "tip", text: "Choisis ta munition selon la cible : EM/Thermique contre boucliers, Explosif/Cinétique contre l'armure. Les Minmatar changent de munition à la volée — un atout tactique." },
        ],
        questions: [
          { q: "Quel est le trou de résistance naturel du bouclier ?", options: ["Explosif", "Cinétique", "Thermique", "EM"], answer: 3 },
          { q: "Contre une coque à tank armure, privilégie…", options: ["EM", "Explosif", "des drones légers", "rien, vise le bouclier"], answer: 1, explain: "L'armure résiste le moins à l'Explosif (10 % de base)." },
          { q: "Pourquoi ne pas sur-empiler la même résistance ?", options: ["Ça coûte du cap", "Pénalité d'empilement (stacking)", "Ça réduit la vitesse", "C'est interdit par CONCORD"], answer: 1 },
        ],
      },
      {
        id: "tank",
        title: "Le tank : bouclier, armure, EHP",
        summary: "Survivre = repousser ET absorber les dégâts.",
        minutes: 7,
        blocks: [
          { t: "p", text: "L'EHP (points de vie effectifs) combine tes PV bruts et tes résistances : c'est le total de dégâts que tu peux encaisser. Doubler une résistance ne double pas le chiffre affiché mais double l'EHP face à ce type de dégât." },
          { t: "h", text: "Buffer vs actif" },
          { t: "ul", items: [
            "Buffer (passif) : gros tampon d'EHP (extenders/plaques + résistances) pour encaisser le burst — idéal en gang avec des logis qui te réparent.",
            "Actif : réparateur d'armure / booster de bouclier qui restaure des PV par cycle — idéal en solo/PvE, mais limité par le capacitor.",
            "Le tank passif bouclier (sans module actif) existe sur certaines coques Caldari à forte régén.",
          ] },
          { t: "kv", title: "Modules clés", rows: [
            ["Bouclier", "Shield Extender (buffer), Shield Booster (actif), Hardener (résist)."],
            ["Armure", "Plates (buffer), Armor Repairer (actif), Energized Membrane (résist)."],
            ["Universel", "Damage Control : grosses résistances sur les 3 couches, surtout la structure."],
          ] },
          { t: "warn", text: "Un réparateur sans cap ne répare plus. Tank actif = surveille ton capacitor en priorité, et méfie-toi des neuts ennemis." },
          { t: "tip", text: "Le Damage Control II est le meilleur rapport EHP/slot du jeu : monte-le presque toujours." },
        ],
        questions: [
          { q: "L'EHP dépend de…", options: ["la vitesse seulement", "PV bruts ET résistances", "du cap uniquement", "de la signature"], answer: 1 },
          { q: "Quel tank dépend le plus du capacitor ?", options: ["Buffer passif", "Tank actif (réparateur/booster)", "Les rigs", "La coque nue"], answer: 1 },
          { q: "Quel module donne des résistances sur les trois couches ?", options: ["Shield Extender", "Damage Control", "Steel Plates", "Heat Sink"], answer: 1 },
        ],
      },
      {
        id: "tackle",
        title: "Tackle : point, scram, web",
        summary: "Empêcher la cible de fuir.",
        minutes: 6,
        blocks: [
          { t: "kv", title: "Modules de tackle", rows: [
            ["Warp Disruptor (point)", "1 point de warp, portée ~20-24 km. Empêche le warp."],
            ["Warp Scrambler (scram)", "2 points, ~7,5-9 km. Empêche le warp ET désactive MWD/MJD."],
            ["Stasis Webifier (web)", "Réduit fortement la vitesse de la cible (jusqu'à ~-90 %), ~10 km."],
          ] },
          { t: "p", text: "Le 'tackle' est la clé du PvP : sans rétention, la cible warpe et le combat n'a pas lieu. Les interceptors (frégates rapides) sont les tacklers dédiés ; certains ignorent les bulles de disruption." },
          { t: "tip", text: "Le scram coupe le MWD : un kiter au MWD devient soudain lent et à portée une fois scram. Le web réduit la transversale et aide tes tourelles à toucher." },
          { t: "warn", text: "La portée du point (~24 km) dépasse celle du scram (~9 km) : un kiter te 'pointe' de loin sans entrer dans ta portée d'armes. Adapte ta distance d'engagement." },
        ],
        questions: [
          { q: "Quel module désactive le MWD de la cible ?", options: ["Warp Disruptor (point)", "Warp Scrambler (scram)", "Stasis Webifier", "Sensor Booster"], answer: 1 },
          { q: "Le 'point' sert à…", options: ["augmenter les dégâts", "empêcher la cible de warper", "réparer l'armure", "brouiller le ciblage"], answer: 1 },
          { q: "Le web est utile pour…", options: ["augmenter ta vitesse", "ralentir la cible et réduire sa transversale", "réparer le bouclier", "scanner"], answer: 1 },
        ],
      },
      {
        id: "portee",
        title: "Portée, suivi & transversale",
        summary: "Pourquoi tes tirs ratent une cible rapide.",
        minutes: 7,
        blocks: [
          { t: "p", text: "Les armes à tourelle (lasers, hybrides, projectiles) appliquent leurs dégâts selon l'optimal + falloff, mais surtout selon la vitesse angulaire (transversale) de la cible relative à ton tracking et à ta signature de tourelle." },
          { t: "ul", items: [
            "Optimal : portée où tu touches à plein. Falloff : au-delà, les dégâts décroissent progressivement.",
            "Transversale élevée + tracking faible = tu rates (petite cible rapide qui orbite près).",
            "Réduire la transversale : aligne-toi sur la cible, webbe-la, ou vole 'droit' plutôt qu'en orbite serrée.",
          ] },
          { t: "h", text: "Les missiles, c'est différent" },
          { t: "ul", items: [
            "Les missiles ignorent le tracking : ils touchent toujours, mais appliquent selon la vitesse d'explosion et le rayon d'explosion vs la signature/vélocité de la cible.",
            "Un petit objet rapide réduit fortement les dégâts de missiles reçus (sig faible).",
            "Une cible webbée (lente) prend bien plus de dégâts de missiles." ,
          ] },
          { t: "tip", text: "Trois manières d'appliquer plus : rapproche-toi de l'optimal, réduis la transversale (web/align), ou utilise des munitions/charges adaptées à la portée." },
        ],
        questions: [
          { q: "Qu'est-ce qui fait rater une tourelle sur une cible rapide proche ?", options: ["L'EHP", "Une transversale élevée vs ton tracking", "Le capacitor", "La signature de ton vaisseau"], answer: 1 },
          { q: "Comment réduire la transversale d'une cible ?", options: ["Mettre un MWD", "La webber / s'aligner sur elle", "Augmenter ta signature", "Tirer en explosif"], answer: 1 },
          { q: "Les missiles appliquent leurs dégâts selon…", options: ["le tracking", "la vitesse/rayon d'explosion vs la sig de la cible", "la couleur de la coque", "le cap restant"], answer: 1 },
        ],
      },
      {
        id: "ewar",
        title: "Guerre électronique (EWAR)",
        summary: "Désactiver l'ennemi sans le détruire.",
        minutes: 7,
        blocks: [
          { t: "kv", title: "Principaux EWAR", rows: [
            ["ECM (brouillage)", "Casse le verrouillage de la cible ; chance liée au type de senseur ennemi."],
            ["Sensor Damp", "Réduit la portée de ciblage et la vitesse de verrouillage."],
            ["Tracking Disruptor", "Dégrade tracking/portée des tourelles ennemies."],
            ["Guidance Disruptor", "Équivalent contre les missiles (portée/vitesse d'explosion)."],
            ["Target Painter", "Augmente la signature de la cible → plus facile à toucher (l'inverse)."],
            ["Neut / Nos", "Vide le capacitor ennemi (tue tank actif, prop et tackle)."],
          ] },
          { t: "p", text: "Les senseurs ont 4 types selon la race : Gravimetric (Caldari), Magnetometric (Gallente), Ladar (Minmatar), Radar (Amarr). Un brouilleur du bon type est bien plus efficace ; un multispectral marche partout mais moins fort." },
          { t: "tip", text: "Les neuts sont l'EWAR le plus universel : couper le cap d'un tank actif ou d'un tackler le neutralise totalement, quel que soit son senseur." },
          { t: "warn", text: "L'ECM rend la cible incapable de te cibler, mais ne l'empêche pas de fuir si elle n'est pas tacklée. Combine toujours EWAR et tackle." },
        ],
        questions: [
          { q: "Quel EWAR vide le capacitor ennemi ?", options: ["ECM", "Sensor Damp", "Energy Neutralizer (neut)", "Tracking Disruptor"], answer: 2 },
          { q: "Le senseur des vaisseaux Amarr est…", options: ["Gravimetric", "Ladar", "Radar", "Magnetometric"], answer: 2 },
          { q: "Que fait un Target Painter ?", options: ["Réduit ta signature", "Augmente la signature de la cible", "Vide le cap", "Casse le lock"], answer: 1 },
        ],
      },
      {
        id: "desengager",
        title: "Désengager & d-scan",
        summary: "Voir venir le danger et partir vivant.",
        minutes: 7,
        blocks: [
          { t: "p", text: "Le scanner directionnel (D-scan) sonde une portion de l'espace (jusqu'à 14,3 UA) dans un angle choisi : c'est ton radar manuel. Spamme-le pour repérer sondes de combat, vaisseaux et drones avant qu'ils ne te trouvent." },
          { t: "ul", items: [
            "Vois des 'Combat Scanner Probes' au d-scan ? On te cherche : bouge, change de spot, ou pars.",
            "Garde toujours un point d'alignement (céleste, bookmark) pour warper instantanément.",
            "Le ratio risque/récompense d'un site ne vaut jamais ta vie : désengage AVANT d'entrer en structure.",
          ] },
          { t: "h", text: "La discipline de fuite" },
          { t: "ul", items: [
            "Pré-aligne sur une sortie pendant que tu farmes.",
            "Surveille le Local (k-space) : un pic de pilotes inconnus = danger.",
            "Connais ton 'GTFO' : le bouton/route de fuite avant même d'engager." ,
          ] },
          { t: "warn", text: "En wormhole, pas de Local : le d-scan et tes bookmarks sont ta seule alerte. Reste paranoïaque, scanne en continu." },
        ],
        questions: [
          { q: "Quelle est la portée max du d-scan ?", options: ["1 UA", "14,3 UA", "100 km", "Tout le système toujours"], answer: 1 },
          { q: "Voir des combat probes au d-scan signifie…", options: ["un site à miner", "qu'on te cherche pour t'attaquer", "une mise à jour serveur", "rien d'important"], answer: 1 },
          { q: "Bonne pratique de survie en farm ?", options: ["Couper le d-scan", "Rester immobile sans bookmark", "Pré-aligner sur une sortie et surveiller le Local", "Désactiver l'overview"], answer: 2 },
        ],
      },
    ],
  },

  // ─────────────────────────── 3. Économie & métiers ──────────────────────────
  {
    id: "economie-metiers",
    title: "Économie & métiers",
    subtitle: "Marché, minage, industrie, exploration, PI",
    level: "Intermédiaire",
    icon: Coins,
    accent: "hsl(var(--success))",
    lessons: [
      {
        id: "marche",
        title: "Le marché : ordres & frais",
        summary: "Acheter, vendre, et ne pas se faire manger par les frais.",
        minutes: 7,
        blocks: [
          { t: "ul", items: [
            "Ordre de vente (sell) : tu proposes un prix ; les acheteurs te prennent immédiatement.",
            "Ordre d'achat (buy) : tu poses un prix d'achat ; les vendeurs te remplissent.",
            "Vendre vite = remplir un ordre d'achat (sell to buy order) ; acheter vite = prendre un ordre de vente.",
            "La portée d'un ordre d'achat (station/système/région/sauts) définit qui peut le remplir.",
          ] },
          { t: "kv", title: "Frais (sur tes ordres)", rows: [
            ["Frais de courtier (broker)", "À la pose d'un ordre. Réduit par Broker Relations + standings de faction/corp."],
            ["Taxe de vente (sales tax)", "Prélevée à la vente. Réduite par la compétence Accounting."],
            ["Relist", "Modifier le prix d'un ordre recoûte un frais de courtier."],
          ] },
          { t: "p", text: "Jita (région The Forge) est le hub principal ; Amarr, Dodixie, Rens et Hek suivent. Le 'spread' = écart entre meilleur achat et meilleure vente ; net de frais, c'est la marge réelle du station trading." },
          { t: "tip", text: "Le Trade Co-Pilot de la suite scanne les hubs pour trouver les flips rentables (marge nette × liquidité) et l'arbitrage inter-hubs — utilise-le après cette leçon." },
        ],
        questions: [
          { q: "Quelle compétence réduit la taxe de vente ?", options: ["Broker Relations", "Accounting", "Trade", "Marketing"], answer: 1 },
          { q: "Vendre instantanément, c'est…", options: ["poser un ordre de vente", "remplir un ordre d'achat existant", "annuler un ordre", "payer CONCORD"], answer: 1 },
          { q: "Le 'spread' d'un objet, c'est…", options: ["sa taxe", "l'écart meilleur achat / meilleure vente", "son volume", "son prix d'install"], answer: 1 },
        ],
      },
      {
        id: "minage",
        title: "Minage & retraitement",
        summary: "Du caillou aux minéraux.",
        minutes: 6,
        blocks: [
          { t: "p", text: "On extrait des astéroïdes (ore), de la glace (ice) ou du gaz. L'ore se retraite (reprocess) en minéraux (Tritanium, Pyerite, Mexallon…) qui alimentent toute l'industrie. La compression réduit le volume pour le transport." },
          { t: "ul", items: [
            "Frégate : Venture (débuter, 2 bonus de minage + soute à minerai).",
            "Barges : Procurer (tanky), Retriever (soute), Covetor (rendement) ; puis Exhumers : Skiff/Mackinaw/Hulk.",
            "Le rendement de retraitement dépend des skills (Reprocessing, Efficiency) et de la structure.",
            "Le minage est passif et répétitif → cible idéale des gankers : reste attentif." ,
          ] },
          { t: "kv", title: "Soutien de flotte de minage", rows: [
            ["Orca / Porpoise", "Boosts de minage, grosse soute, drones d'extraction."],
            ["Rorqual", "Capital minier (null-sec) : boosts énormes, mais cible de choix."],
          ] },
          { t: "warn", text: "En low/null, garde un œil constant sur le Local et le d-scan : une barge n'a aucune chance face à un gang. Mine 'tanké' (Procurer/Skiff) en zone risquée." },
        ],
        questions: [
          { q: "Quel vaisseau pour débuter le minage ?", options: ["Hulk", "Venture", "Rorqual", "Catalyst"], answer: 1 },
          { q: "Le retraitement de l'ore donne…", options: ["de l'ISK directement", "des minéraux", "des blueprints", "du carburant"], answer: 1 },
          { q: "Quelle barge privilégier en zone dangereuse ?", options: ["Covetor (rendement)", "Procurer/Skiff (tank)", "Retriever (soute)", "Venture seulement"], answer: 1 },
        ],
      },
      {
        id: "industrie",
        title: "Industrie : blueprints, ME/TE",
        summary: "Fabriquer pour vendre.",
        minutes: 7,
        blocks: [
          { t: "kv", title: "Blueprints", rows: [
            ["BPO (original)", "Réutilisable à l'infini ; se recherche en ME/TE (Material/Time Efficiency)."],
            ["BPC (copie)", "Nombre de runs limité ; issu d'une copie d'un BPO ou de l'invention (T2)."],
          ] },
          { t: "ul", items: [
            "ME (Material Efficiency) : réduit les matériaux nécessaires (jusqu'à -10 % au niveau 10).",
            "TE (Time Efficiency) : réduit le temps de fabrication (jusqu'à -20 %).",
            "Coût d'install (job fee) = EIV (valeur basée sur l'adjusted price ESI) × index système + taxes structure/SCC.",
            "L'invention transforme des BPC T1 en BPC T2 avec une probabilité (datacores requis).",
          ] },
          { t: "p", text: "La chaîne complète : minéraux/composants → fabrication → vente. Mesure toujours ton coût de revient (matériaux + frais d'install) contre le prix de vente Jita avant de lancer un job." },
          { t: "tip", text: "L'outil Industry & Cost Tracker de la suite calcule ME/EIV/SCC et compare au prix Jita public — parfait pour valider la rentabilité d'un job." },
        ],
        questions: [
          { q: "Que réduit le ME d'un blueprint ?", options: ["Le temps de fabrication", "Les matériaux nécessaires", "La taxe de vente", "Le coût d'install"], answer: 1 },
          { q: "Un BPC est…", options: ["réutilisable à l'infini", "limité en nombre de runs", "un minéral", "un module"], answer: 1 },
          { q: "À quoi sert l'invention ?", options: ["Réparer un vaisseau", "Créer des BPC T2 depuis des BPC T1", "Réduire la taxe", "Scanner des sites"], answer: 1 },
        ],
      },
      {
        id: "exploration",
        title: "Exploration : scan & hacking",
        summary: "Sonder l'inconnu pour des récompenses.",
        minutes: 7,
        blocks: [
          { t: "p", text: "Avec un Core Probe Launcher et des sondes, tu scannes les 'signatures cosmiques' : sites de données (data) et de reliques (relic) se piratent au mini-jeu de hacking pour du butin ; il y a aussi des sites de combat et des trous de ver." },
          { t: "ol", items: [
            "Ouvre la carte de scan, lance les sondes et resserre la formation autour du signal.",
            "Monte la force du signal à 100 % pour obtenir un point de warp précis.",
            "Warpe au site, puis pirate les conteneurs (gère le 'spew' qui éparpille le loot).",
            "Repère les frégates d'exploration : Heron, Magnate, Imicus, Probe (T1) ; Astero/Stratios (faction, avec cloak)." ,
          ] },
          { t: "kv", title: "Frégates d'exploration", rows: [
            ["T1 (bon marché)", "Heron (Caldari), Magnate (Amarr), Imicus (Gallente), Probe (Minmatar)."],
            ["Faction", "Astero : cloak + bonus scan/hacking ; Stratios : cruiser explo/combat."],
          ] },
          { t: "warn", text: "Les meilleurs sites sont en low/null/WH. Vaisseau peu cher, nerfs solides (cloak !), et fuis au moindre doute : l'explo se joue discret et patient." },
        ],
        questions: [
          { q: "Que scanne-t-on pour l'exploration ?", options: ["Les ordres de marché", "Les signatures cosmiques", "Les killmails", "Les compétences"], answer: 1 },
          { q: "Un site de reliques se résout par…", options: ["du minage", "le mini-jeu de hacking", "un combat de flotte", "un ordre d'achat"], answer: 1 },
          { q: "Quel atout rend l'Astero idéal pour explorer en zone hostile ?", options: ["Sa vitesse de warp", "Son cloak (camouflage)", "Sa grosse soute", "Ses missiles"], answer: 1 },
        ],
      },
      {
        id: "pi",
        title: "Planetary Interaction",
        summary: "Du revenu passif depuis les planètes.",
        minutes: 6,
        blocks: [
          { t: "p", text: "La PI extrait des ressources brutes (P0) sur les planètes et les raffine en paliers (P1 → P4) via des installations, pour les revendre ou alimenter l'industrie (carburant de structures, composants avancés)." },
          { t: "ul", items: [
            "Chaque type de planète (lave, gaz, océan, barren…) propose des P0 différents.",
            "Les extracteurs subissent un 'decay' : le rendement décroît sur la durée du programme.",
            "Équilibre extraction et usines pour éviter surplus/déficit.",
            "Les taxes de POCO (douane orbitale) grèvent imports/exports — compte-les dans l'ISK/h." ,
          ] },
          { t: "tip", text: "Plusieurs planètes/alts multiplient le revenu. L'EVE PI Sim de la suite modélise le decay et l'ISK/heure net (taxe POCO incluse) pour optimiser ton setup." },
        ],
        questions: [
          { q: "La PI produit du revenu plutôt…", options: ["instantané en combat", "passif depuis les planètes", "uniquement en wormhole", "via le marché seulement"], answer: 1 },
          { q: "Le 'decay' d'un extracteur signifie…", options: ["qu'il explose", "que son rendement décroît dans le temps", "qu'il double la production", "qu'il ne coûte rien"], answer: 1 },
          { q: "Que grèvent les taxes de POCO ?", options: ["Le warp", "Les imports/exports planétaires", "Les compétences", "Le tank"], answer: 1 },
        ],
      },
    ],
  },

  // ───────────────────────── 4. Espace & communauté ──────────────────────────
  {
    id: "espace-communaute",
    title: "Espace & communauté",
    subtitle: "Types d'espace, corporations, structures, logistique, opsec",
    level: "Avancé",
    icon: Globe2,
    accent: "hsl(var(--fleur))",
    lessons: [
      {
        id: "types-espace",
        title: "Hi-sec, low, null & wormholes",
        summary: "Quatre mondes, quatre règles.",
        minutes: 6,
        blocks: [
          { t: "kv", title: "Espaces", rows: [
            ["High-sec", "Sûr (CONCORD), revenus modestes, idéal pour apprendre."],
            ["Low-sec", "PvP libre, faction warfare, gisements et sites plus riches, gardes de portes."],
            ["Null-sec", "Souveraineté, capitaux/supers, meilleurs revenus mais politique et timers."],
            ["Wormholes (J-space)", "Pas de Local, connexions instables, butin élevé, paranoïa requise."],
          ] },
          { t: "p", text: "Le null-sec se divise en souveraineté tenue par les alliances (NPC null = stations PNJ, pas de sov). Les wormholes ont des 'classes' (C1→C6) de difficulté et des effets de système qui modifient les stats." },
          { t: "tip", text: "Progresse par paliers : maîtrise le high-sec, fais de l'explo/FW en low, puis rejoins une corp null/WH pour l'endgame collectif." },
        ],
        questions: [
          { q: "Quel espace n'a pas de Local peuplé ?", options: ["High-sec", "Low-sec", "Null-sec", "Wormholes"], answer: 3 },
          { q: "La souveraineté concerne surtout…", options: ["le high-sec", "le null-sec", "les wormholes", "Jita"], answer: 1 },
          { q: "Les wormholes sont classés…", options: ["par couleur", "en classes C1 à C6 de difficulté", "par faction", "par taxe"], answer: 1 },
        ],
      },
      {
        id: "corporations",
        title: "Corporations & alliances",
        summary: "EVE est un jeu d'équipe.",
        minutes: 6,
        blocks: [
          { t: "p", text: "Une corporation regroupe des joueurs (chacun débute dans une corp PNJ). Les alliances regroupent des corps ; les coalitions, des alliances. C'est le tissu social, militaire et économique d'EVE — le vrai endgame est collectif." },
          { t: "ul", items: [
            "Rejoindre une corp joueur débloque flottes, mentors, accès au null/WH, et un but.",
            "Méfie-toi : espionnage, 'awoxing' (trahison interne) et vols de hangar existent.",
            "Vérifie l'historique d'une corp (zKillboard, réputation, killboard de flotte) avant de rejoindre.",
            "Les rôles (roles) déterminent l'accès aux hangars et aux fonds : à régler avec soin." ,
          ] },
          { t: "warn", text: "Ne mets jamais dans un hangar corp ce que tu n'es pas prêt à perdre : des rôles mal réglés = vol assuré. Et un 'recruteur' trop pressé cache souvent une arnaque." },
        ],
        questions: [
          { q: "Une alliance regroupe…", options: ["des planètes", "des corporations", "des systèmes", "des blueprints"], answer: 1 },
          { q: "Le 'awoxing' désigne…", options: ["un type de minage", "la trahison/kill interne d'une corp", "un EWAR", "une taxe"], answer: 1 },
          { q: "Avant de rejoindre une corp, vérifie…", options: ["sa couleur", "son historique/réputation (killboard)", "son nombre de planètes", "sa taxe d'install"], answer: 1 },
        ],
      },
      {
        id: "structures",
        title: "Citadels & structures",
        summary: "Stations joueurs : marché, industrie, dock.",
        minutes: 6,
        blocks: [
          { t: "p", text: "Les structures Upwell (Astrahus, Fortizar, Keepstar pour les citadelles ; Raitaru/Azbel/Sotiyo pour l'industrie ; Athanor/Tatara pour le raffinage) offrent dock, marché, industrie, reprocessing et services, avec des bonus selon le type." },
          { t: "ul", items: [
            "Elles ont des cycles de vulnérabilité et plusieurs 'timers' (shield/armor/hull) avant destruction.",
            "Tes actifs dans une structure détruite tombent en 'asset safety' (récupérables ailleurs contre frais).",
            "Les structures joueurs n'apparaissent pas dans l'ESI /universe/names public (accès/docking requis).",
          ] },
          { t: "tip", text: "Docker dans une structure joueur peut offrir taxes réduites et bonus industriels — mais tu dépends de son propriétaire (droits d'accès révocables)." },
        ],
        questions: [
          { q: "Que deviennent tes actifs si une structure où tu es basé est détruite ?", options: ["Perdus définitivement", "Mis en asset safety", "Transférés à CONCORD", "Convertis en ISK"], answer: 1 },
          { q: "Une Keepstar est…", options: ["un minéral", "une grande citadelle joueur", "un EWAR", "une compétence"], answer: 1 },
          { q: "Combien de timers protègent typiquement une structure ?", options: ["Aucun", "Plusieurs (shield/armor/hull)", "Un seul instantané", "Dix"], answer: 1 },
        ],
      },
      {
        id: "logistique",
        title: "Logistique & jump",
        summary: "Déplacer du volume sans tout perdre.",
        minutes: 6,
        blocks: [
          { t: "ul", items: [
            "Industriels & Deep Space Transports : volume vs tank ; Blockade Runners : warp-cloak pour traverser.",
            "Freighters : volume énorme, zéro défense → jamais en autopilot, escorte/anti-gank recommandés.",
            "Jump Freighters & capitaux : voyagent par jump drive entre cynos, hors des portes.",
            "Le 'web' d'un allié (ex. depuis une structure) accélère l'alignement d'un freighter pour le sécuriser." ,
          ] },
          { t: "kv", title: "Choisir son transport", rows: [
            ["Petit volume, sûr", "Blockade Runner (cloak) — passe partout discrètement."],
            ["Gros volume, high-sec", "Freighter — mais surveille la valeur transportée."],
            ["Inter-régions massif", "Jump Freighter / réseau de cynos."],
          ] },
          { t: "warn", text: "Le gank de freighters en high-sec est un métier : ne transporte jamais une valeur supérieure à ce que ton tank/escorte protège, fractionne les cargaisons, et évite l'autopilot." },
        ],
        questions: [
          { q: "Quel vaisseau passe les blocus grâce au cloak en warp ?", options: ["Freighter", "Blockade Runner", "Venture", "Capsule"], answer: 1 },
          { q: "Comment voyagent les jump freighters ?", options: ["Par les portes", "Par jump drive vers des cynos", "En warp uniquement", "Par le marché"], answer: 1 },
          { q: "Bonne pratique pour un freighter ?", options: ["Autopilot la nuit", "Transporter toute sa fortune d'un coup", "Fractionner la valeur et éviter l'autopilot", "Couper le tank"], answer: 2 },
        ],
      },
      {
        id: "opsec",
        title: "Sécurité & bonnes pratiques",
        summary: "Ne jamais voler ce qu'on ne peut pas perdre.",
        minutes: 6,
        blocks: [
          { t: "p", text: "La maxime d'EVE : « Don't fly what you can't afford to lose. » Chaque sortie est un pari ; gère le risque comme un budget. La perte fait partie du jeu — l'important est qu'elle soit calculée." },
          { t: "ul", items: [
            "Méfie-toi des arnaques : contrats piégés (lis le détail !), échanges de fenêtre, 'double ou rien', faux escrows, liens douteux.",
            "Active l'authentification à deux facteurs (2FA) sur ton compte EVE.",
            "Garde des fits jetables et des clones à jour ; warpe tôt, vis plus longtemps.",
            "Ne révèle pas tes mouvements/horaires à des inconnus : le renseignement tue." ,
          ] },
          { t: "tip", text: "Le vrai capital d'un capsuleer, c'est l'expérience : une perte analysée (voir le Loss Analyzer de la suite) vaut une leçon payée." },
        ],
        questions: [
          { q: "La règle d'or financière d'EVE est…", options: ["Toujours voler le vaisseau le plus cher", "Ne pas voler ce qu'on ne peut pas perdre", "Ne jamais combattre", "Miner uniquement"], answer: 1 },
          { q: "Bonne pratique de compte ?", options: ["Partager son mot de passe", "Activer la 2FA", "Désactiver le clone", "Autopilot en freighter"], answer: 1 },
          { q: "Face à un contrat 'trop beau' ?", options: ["Accepter vite", "Lire chaque détail (souvent une arnaque)", "Le partager", "Le signaler à CONCORD"], answer: 1 },
        ],
      },
    ],
  },

  // ───────────────────────── 5. Compétences & clones ─────────────────────────
  {
    id: "competences-clones",
    title: "Compétences & clones",
    subtitle: "Attributs, plans, clones, implants, SP",
    level: "Débutant",
    icon: Brain,
    accent: "hsl(var(--primary))",
    lessons: [
      {
        id: "attributs",
        title: "Attributs & vitesse d'entraînement",
        summary: "Pourquoi certains skills vont plus vite.",
        minutes: 6,
        blocks: [
          { t: "p", text: "Cinq attributs gouvernent la vitesse d'entraînement : Intelligence, Mémoire, Perception, Volonté, Charisme. Chaque skill a un attribut primaire et un secondaire ; ta vitesse (SP/h) = primaire + (secondaire / 2)." },
          { t: "ul", items: [
            "Les attributs ne changent rien à la puissance du skill, seulement au temps d'entraînement.",
            "Tu peux 'remap' tes attributs un nombre limité de fois par an (plus des remaps bonus).",
            "Un remap vers Intelligence/Mémoire accélère un long bloc d'industrie/science, par ex." ,
          ] },
          { t: "tip", text: "Ne te prends pas la tête au début : un remap équilibré convient. Optimise les remaps quand tu planifies de longs blocs (mois) dans une même catégorie." },
        ],
        questions: [
          { q: "Les attributs influencent…", options: ["la puissance des skills", "la vitesse d'entraînement", "le tank", "le warp"], answer: 1 },
          { q: "La vitesse d'un skill se calcule…", options: ["primaire + secondaire/2", "primaire × secondaire", "secondaire seul", "au hasard"], answer: 0 },
          { q: "Un remap d'attributs sert à…", options: ["changer de race", "accélérer un bloc d'entraînement ciblé", "gagner de l'ISK", "réinitialiser ses skills"], answer: 1 },
        ],
      },
      {
        id: "skill-plan",
        title: "Construire un plan de skills",
        summary: "Tracer un cap au lieu de papillonner.",
        minutes: 6,
        blocks: [
          { t: "p", text: "Un bon plan suit un objectif (ex. 'piloter un Hurricane bien fitté en PvP') et remonte ses prérequis : coque, armes, tank, support cap/nav/fitting. Mieux vaut un objectif net qu'une file au hasard." },
          { t: "ol", items: [
            "Choisis un objectif concret (un vaisseau + un rôle).",
            "Liste les prérequis du fit visé (skills d'armes, tank, support).",
            "Priorise : ce qui débloque le plus tôt un vaisseau utilisable.",
            "Vise les niveaux IV ; réserve les V aux skills à fort impact (ex. spécialisations d'armes T2)." ,
          ] },
          { t: "tip", text: "L'outil Skills de la suite aide à planifier la file et estimer les durées. Garde toujours plusieurs jours de file d'avance." },
        ],
        questions: [
          { q: "Un plan de skills part idéalement…", options: ["d'un objectif concret (vaisseau+rôle)", "du skill le plus cher", "au hasard", "des skills de minage seulement"], answer: 0 },
          { q: "Quels niveaux viser en priorité ?", options: ["Tout au V immédiatement", "Des IV bien répartis", "Le I partout", "Aucun"], answer: 1 },
          { q: "Pourquoi garder de l'avance dans la file ?", options: ["Pour le tank", "Pour ne pas perdre de temps d'entraînement", "Pour la taxe", "Pour le warp"], answer: 1 },
        ],
      },
      {
        id: "clones",
        title: "Clones & jump clones",
        summary: "Plusieurs corps, plusieurs jeux d'implants.",
        minutes: 6,
        blocks: [
          { t: "p", text: "Ton clone médical définit où tu réapparais après un pod. Les jump clones sont des corps de rechange stockés ailleurs : tu peux 'sauter' dedans (cooldown ~1 jour, réduit par skills) pour changer d'implants ou de localisation sans voyager." },
          { t: "ul", items: [
            "Un jump clone PvP (sans implants chers) évite de perdre une fortune si tu es podé.",
            "Un jump clone 'training' (implants d'attribut +5) accélère l'entraînement quand tu n'es pas en combat.",
            "Sauter en jump clone te ramène dans un autre corps ; l'ancien reste où il était." ,
          ] },
          { t: "warn", text: "Les implants installés sont détruits si tu es podé. Ne vole pas en combat avec des implants hors de prix sans accepter le risque." },
        ],
        questions: [
          { q: "À quoi sert un jump clone ?", options: ["Doubler ses skills", "Changer d'implants/localisation sans voyager", "Réparer son vaisseau", "Miner plus vite"], answer: 1 },
          { q: "Les implants sont détruits…", options: ["à chaque saut de porte", "si tu es podé", "jamais", "au docking"], answer: 1 },
          { q: "Un clone PvP intelligent contient…", options: ["des implants très chers", "peu ou pas d'implants coûteux", "des blueprints", "du minerai"], answer: 1 },
        ],
      },
      {
        id: "implants",
        title: "Implants & boosters",
        summary: "Des bonus… à tes risques et périls.",
        minutes: 6,
        blocks: [
          { t: "kv", title: "Deux familles", rows: [
            ["Implants (slots 1-10)", "Bonus permanents : attributs (1-5) accélèrent l'entraînement ; 6-10 améliorent skills/stats (ex. Hardwirings)."],
            ["Boosters (drugs)", "Effets temporaires puissants (vitesse, dégâts, tank…) avec risques d'effets secondaires."],
          ] },
          { t: "ul", items: [
            "Les implants +3/+4/+5 accélèrent l'entraînement, mais sont perdus si podé.",
            "Les boosters de combat donnent un edge ponctuel ; certains illégaux baissent le sec status à l'usage.",
            "Évalue toujours le gain vs le coût/risque selon l'activité (PvE tranquille vs PvP risqué)." ,
          ] },
          { t: "tip", text: "Garde tes implants chers sur un jump clone 'safe' (station/structure sûre) et combats dans un clone bon marché." },
        ],
        questions: [
          { q: "Les implants d'attribut (slots 1-5)…", options: ["augmentent les dégâts", "accélèrent l'entraînement", "réparent l'armure", "scannent"], answer: 1 },
          { q: "Les boosters offrent…", options: ["des bonus permanents", "des effets temporaires (avec risques)", "des skills gratuits", "de l'ISK"], answer: 1 },
          { q: "Où garder ses implants chers ?", options: ["En combat", "Sur un jump clone safe", "Dans un freighter", "Au marché"], answer: 1 },
        ],
      },
      {
        id: "sp-trading",
        title: "Injecteurs & extracteurs de SP",
        summary: "Acheter du temps… contre de l'ISK.",
        minutes: 5,
        blocks: [
          { t: "p", text: "Les Skill Extractors retirent 500 000 SP d'un perso (au-delà de 5,5 M SP) pour créer un Skill Injector, vendable au marché. Un injecteur donne 500 000 SP au receveur — moins si le perso a déjà beaucoup de SP (rendement dégressif)." },
          { t: "kv", title: "Rendement d'un injecteur (Large)", rows: [
            ["< 5 M SP", "500 000 SP"],
            ["5–50 M SP", "400 000 SP"],
            ["50–80 M SP", "300 000 SP"],
            ["> 80 M SP", "150 000 SP"],
          ] },
          { t: "warn", text: "Acheter des SP coûte cher et ne remplace pas l'expérience : tu peux 'débloquer' un vaisseau sans savoir le piloter. Utilise les injecteurs pour combler un trou précis, pas pour sauter l'apprentissage." },
        ],
        questions: [
          { q: "Un Skill Injector standard donne au maximum…", options: ["150 000 SP", "500 000 SP", "1 M SP", "100 SP"], answer: 1 },
          { q: "Le rendement d'un injecteur…", options: ["est constant", "diminue quand le perso a beaucoup de SP", "augmente avec les SP", "dépend du tank"], answer: 1 },
          { q: "Le risque d'acheter trop de SP ?", options: ["Perdre ses implants", "Piloter un vaisseau sans savoir le jouer", "Baisser son sec status", "Rien"], answer: 1 },
        ],
      },
    ],
  },

  // ───────────────────────────── 6. Revenus & PvE ────────────────────────────
  {
    id: "revenus-pve",
    title: "Revenus & PvE",
    subtitle: "Missions, standings, ratting, abyssal, incursions, FW",
    level: "Intermédiaire",
    icon: Crosshair,
    accent: "hsl(var(--success))",
    lessons: [
      {
        id: "missions",
        title: "Agents & missions",
        summary: "Le revenu PvE le plus accessible.",
        minutes: 7,
        blocks: [
          { t: "p", text: "Les agents PNJ (dans les stations) confient des missions notées de niveau 1 à 5. Tu progresses des L1 (frégate) vers les L4 (battleship) à mesure que ta réputation (standing) monte." },
          { t: "kv", title: "Types de missions", rows: [
            ["Security", "Combat : tuer des PNJ. Le cœur du PvE ISK."],
            ["Distribution", "Transport de marchandises (peu de combat)."],
            ["Mining", "Extraction sur commande."],
          ] },
          { t: "ul", items: [
            "Les L4 de sécurité (souvent en battleship/marauder) sont un revenu high-sec classique.",
            "Le 'loot' et les bounties s'ajoutent à la récompense + LP (Loyalty Points).",
            "Les LP s'échangent au LP Store contre des objets faction revendables — gros complément d'ISK." ,
          ] },
          { t: "tip", text: "Adapte ton tank au type de dégâts de la faction de mission (ex. Serpentis = Kin/Therm). Le Loss Analyzer et le Ship Trainer t'aident à connaître ces profils." },
        ],
        questions: [
          { q: "Les missions de sécurité consistent à…", options: ["transporter", "tuer des PNJ", "miner", "scanner"], answer: 1 },
          { q: "Les LP (Loyalty Points) servent à…", options: ["accélérer les skills", "acheter au LP Store des objets revendables", "réparer", "baisser la taxe"], answer: 1 },
          { q: "On débloque les missions L4 en…", options: ["payant CONCORD", "montant son standing avec l'agent/faction", "achetant un BPO", "minant"], answer: 1 },
        ],
      },
      {
        id: "standings",
        title: "Standings & réputation",
        summary: "Qui t'aime, qui te tire dessus.",
        minutes: 5,
        blocks: [
          { t: "p", text: "Les standings mesurent ta réputation envers agents, corporations et factions. Ils débloquent des agents de meilleur niveau, réduisent les frais de courtier/taxes, et conditionnent l'accès à certains espaces (FW, niveaux d'agents)." },
          { t: "ul", items: [
            "Monter un standing de faction prend du temps (missions, storyline).",
            "Tirer sur une faction baisse ton standing avec elle (et parfois ses alliés).",
            "Connaissances (Connections/Diplomacy) améliorent les standings effectifs positifs/négatifs." ,
          ] },
          { t: "tip", text: "De bons standings de faction réduisent tes frais de courtier au marché — un gain discret mais réel pour les traders." },
        ],
        questions: [
          { q: "Les standings influencent…", options: ["la vitesse de warp", "l'accès aux agents et les frais", "le tank", "le minage"], answer: 1 },
          { q: "Tirer sur une faction…", options: ["augmente son standing", "baisse ton standing avec elle", "n'a aucun effet", "te donne des LP"], answer: 1 },
        ],
      },
      {
        id: "ratting",
        title: "Ratting & anomalies",
        summary: "Farmer les PNJ en null-sec.",
        minutes: 6,
        blocks: [
          { t: "p", text: "Le 'ratting' consiste à tuer des PNJ (rats) pour des bounties. En null-sec, les anomalies de combat (détectées sans scan) et les sites d'élite offrent de bons revenus, surtout avec des bonus de souveraineté." },
          { t: "ul", items: [
            "Vaisseaux courants : cruisers/BS à drones (Gila, Ishtar, Dominix) ou carriers/supers en sov tenue.",
            "Surveille le Local et le d-scan : un 'hunter' (souvent en vaisseau cloaké) peut surgir.",
            "Garde une route de fuite et un tank suffisant ; ne rate jamais 'à fond' sans veille." ,
          ] },
          { t: "warn", text: "Le ratting attire les chasseurs : un AFK-ratter est un kill facile. Pré-aligne, surveille, et désengage au moindre inconnu en Local." },
        ],
        questions: [
          { q: "Le 'ratting' consiste à…", options: ["miner", "tuer des PNJ pour des bounties", "transporter", "scanner des WH"], answer: 1 },
          { q: "Un risque majeur du ratting null-sec ?", options: ["La taxe", "Les chasseurs (hunters) cloakés", "Le decay", "Le broker fee"], answer: 1 },
        ],
      },
      {
        id: "abyssal",
        title: "Abyssal Deadspace",
        summary: "20 minutes, en solo, contre la montre.",
        minutes: 6,
        blocks: [
          { t: "p", text: "Les Abyssal Deadspace sont des poches instanciées : tu entres avec un filament, affrontes des vagues de PNJ dans une bulle qui te tue si tu en sors, et dois finir avant la fin du timer (~20 min). Les tiers (T0→T6) montent en difficulté et en récompense." },
          { t: "ul", items: [
            "Souvent en cruiser (Gila très populaire) ou frégates/destroyers en groupe.",
            "Pas de Local : prépare ton fit et tes consommables (cap booster, paste) à l'avance.",
            "Mourir = perte totale (vaisseau + butin) ; monte en tier progressivement." ,
          ] },
          { t: "warn", text: "Sortir de la bulle ou dépasser le timer = mort assurée. Teste un fit en T1/T2 avant de viser les hauts tiers, où une erreur ne pardonne pas." },
        ],
        questions: [
          { q: "Que se passe-t-il si tu dépasses le timer abyssal ?", options: ["Tu sors gratuitement", "Tu meurs (perte totale)", "Tu gagnes un bonus", "Rien"], answer: 1 },
          { q: "Un vaisseau emblématique de l'abyssal solo est…", options: ["le Charon", "le Gila", "la Venture", "l'Astrahus"], answer: 1 },
        ],
      },
      {
        id: "incursions",
        title: "Incursions",
        summary: "Du PvE de flotte très rémunérateur.",
        minutes: 5,
        blocks: [
          { t: "p", text: "Les Incursions sont des invasions Sansha à l'échelle d'une constellation : des flottes de joueurs nettoient des sites coordonnés pour de grosses récompenses ISK + LP. C'est du PvE social, organisé et exigeant en fit/discipline." },
          { t: "ul", items: [
            "Rôles classiques : DPS (souvent battleships faction), logi (soin de flotte), snipers.",
            "Les communautés d'incursion imposent des fits et un minimum d'EHP/DPS pour entrer.",
            "Très rentable à l'heure, mais nécessite coordination et standings/fit conformes." ,
          ] },
          { t: "tip", text: "Les incursions sont une excellente passerelle vers le jeu de flotte (discipline, broadcasts, logi) tout en gagnant bien sa vie." },
        ],
        questions: [
          { q: "Une incursion se joue plutôt…", options: ["en solo", "en flotte coordonnée", "en minant", "au marché"], answer: 1 },
          { q: "Quel rôle soigne la flotte ?", options: ["DPS", "Logi", "Tackle", "Miner"], answer: 1 },
        ],
      },
      {
        id: "faction-warfare",
        title: "Faction Warfare",
        summary: "Du PvP accessible avec des objectifs.",
        minutes: 6,
        blocks: [
          { t: "p", text: "La Faction Warfare (FW) oppose les quatre empires en low-sec : tu t'enrôles pour une faction, captures des complexes ('plexes') et gagnes des LP échangeables contre des objets faction très demandés. C'est l'une des meilleures portes d'entrée au PvP." },
          { t: "ul", items: [
            "Les plexes ont des restrictions de taille (novice = frégates, small = destroyers/frégates, etc.).",
            "Capturer fait monter/baisser le contrôle des systèmes (et les bonus associés).",
            "Frégates faction (Comet, Firetail, Hookbill, Slicer) brillent en FW." ,
          ] },
          { t: "tip", text: "La FW combine objectif + PvP + revenu (LP) dans des combats à taille limitée : parfait pour apprendre à se battre sans tout risquer." },
        ],
        questions: [
          { q: "La Faction Warfare se déroule surtout en…", options: ["high-sec", "low-sec", "wormholes", "Jita"], answer: 1 },
          { q: "On y gagne principalement…", options: ["des blueprints", "des LP (objets faction)", "des skills", "du minerai"], answer: 1 },
          { q: "Les plexes 'novice' n'autorisent que…", options: ["les battleships", "les frégates", "les capitaux", "les freighters"], answer: 1 },
        ],
      },
    ],
  },

  // ───────────────────────── 7. Vaisseaux & doctrines ────────────────────────
  {
    id: "vaisseaux-doctrines",
    title: "Vaisseaux & doctrines",
    subtitle: "Classes, tech, rôles, capitaux, choisir sa coque",
    level: "Intermédiaire",
    icon: Ship,
    accent: "hsl(var(--fc))",
    lessons: [
      {
        id: "classes",
        title: "Classes & tailles de vaisseaux",
        summary: "De la frégate au titan.",
        minutes: 7,
        blocks: [
          { t: "kv", title: "Tailles (sub-capitaux)", rows: [
            ["Frégate / Destroyer", "Petit, rapide, signature faible. Tackle, explo, anti-frégate."],
            ["Croiseur / Battlecruiser", "Polyvalent ; cœur de beaucoup de doctrines."],
            ["Battleship", "Gros DPS/EHP, lent ; PvE L4, lignes de bataille PvP."],
          ] },
          { t: "kv", title: "Capitaux & au-delà", rows: [
            ["Dreadnought / Carrier", "Capitaux : sièges de structures, combats capitaux."],
            ["Force Aux / FAX", "Logistique capitale (soin)."],
            ["Supercarrier / Titan", "Super-capitaux : endgame d'alliance, énormément d'ISK."],
          ] },
          { t: "p", text: "Plus c'est gros, plus la signature et l'inertie augmentent : un battleship encaisse mais touche mal les frégates rapides (d'où l'intérêt des webs/drones). Les petits vaisseaux sont fragiles mais agiles et difficiles à toucher." },
          { t: "tip", text: "Le contre d'une grosse coque, c'est souvent plus petit et rapide (sous le tracking) — et inversement. Le 'rock-paper-scissors' des tailles structure tout le PvP." },
        ],
        questions: [
          { q: "Un battleship a du mal à toucher…", options: ["un autre battleship", "une frégate rapide proche", "une structure", "un astéroïde"], answer: 1 },
          { q: "Quel rôle typique pour une frégate ?", options: ["Ligne de bataille", "Tackle / explo", "Siège de structure", "Logistique capitale"], answer: 1 },
          { q: "Les super-capitaux (titans) sont…", options: ["pour débuter", "l'endgame d'alliance", "des frégates", "gratuits"], answer: 1 },
        ],
      },
      {
        id: "tech",
        title: "Niveaux de technologie",
        summary: "T1, T2, T3, faction, deadspace, officer.",
        minutes: 6,
        blocks: [
          { t: "kv", title: "Tiers", rows: [
            ["Tech I (T1)", "Bon marché, polyvalent, idéal apprentissage."],
            ["Tech II (T2)", "Spécialisé et plus puissant (HAC, interceptors, logi, recons…), prérequis skills."],
            ["Tech III (T3)", "Croiseurs stratégiques modulaires (sous-systèmes configurables)."],
            ["Faction / Navy", "Versions améliorées des T1 (souvent via LP/marché)."],
            ["Deadspace / Officer", "Modules d'élite très chers (PvE haut tier, bling PvP)."],
          ] },
          { t: "p", text: "Plus le tier est élevé, plus c'est cher et risqué à perdre. Un T1/T2 bien piloté bat souvent un T2/faction mal joué : la compétence prime sur le bling." },
          { t: "tip", text: "Apprends en T1, spécialise-toi en T2. Réserve faction/deadspace aux activités où le gain justifie le risque (ou que tu peux te permettre de perdre)." },
        ],
        questions: [
          { q: "Le Tech II est…", options: ["moins cher que T1", "spécialisé et plus puissant, avec prérequis skills", "interdit en high-sec", "réservé au minage"], answer: 1 },
          { q: "Les modules Officer sont…", options: ["gratuits", "d'élite et très chers", "des skills", "des minerais"], answer: 1 },
          { q: "Un T3 cruiser se distingue par…", options: ["ses sous-systèmes modulaires", "l'absence de slots", "son immunité", "sa gratuité"], answer: 0 },
        ],
      },
      {
        id: "roles",
        title: "Rôles tactiques en flotte",
        summary: "Chaque coque a un job.",
        minutes: 7,
        blocks: [
          { t: "kv", title: "Rôles clés", rows: [
            ["DPS", "Inflige les dégâts (BS, HAC, BC…)."],
            ["Tackle", "Retient l'ennemi (interceptors, frégates)."],
            ["Logistics (logi)", "Répare la flotte à distance (Guardian, Basilisk…)."],
            ["EWAR / Recon", "Brouille, damp, neut (Falcon, Huginn, Pilgrim…)."],
            ["Command", "Boosts de flotte (Command Ships, T3)."],
            ["Interdiction", "Bulles anti-warp (Sabre, HIC) pour piéger."],
          ] },
          { t: "p", text: "Une flotte équilibrée combine ces rôles : du DPS soutenu par des logis, sécurisé par du tackle/interdiction et amplifié par l'EWAR et les boosts. Comprendre les rôles, c'est savoir quelle cible 'primary' en premier (souvent logi/tackle adverse)." },
          { t: "tip", text: "En PvP de flotte, écoute le FC : 'primary X', 'align out', 'broadcast for reps'. Connaître ton rôle vaut mieux que ton DPS individuel." },
        ],
        questions: [
          { q: "Le rôle 'logi' consiste à…", options: ["infliger des dégâts", "réparer la flotte à distance", "miner", "scanner"], answer: 1 },
          { q: "Quel vaisseau pose des bulles anti-warp ?", options: ["Guardian", "Sabre (interdictor)", "Venture", "Charon"], answer: 1 },
          { q: "Une cible 'primary' fréquente en PvP de flotte ?", options: ["Le freighter allié", "Le logi/tackle adverse", "Un astéroïde", "Une structure neutre"], answer: 1 },
        ],
      },
      {
        id: "capitaux",
        title: "Capitaux & super-capitaux",
        summary: "La puissance… et le poids des responsabilités.",
        minutes: 6,
        blocks: [
          { t: "kv", title: "Familles capitales", rows: [
            ["Dreadnought", "Énorme DPS anti-structure/anti-capital (mode siège)."],
            ["Carrier", "Drones lourds (fighters), polyvalent."],
            ["Force Auxiliary (FAX)", "Logistique capitale (soin massif)."],
            ["Rorqual", "Capital minier (boosts + extraction null)."],
            ["Supercarrier / Titan", "Super-capitaux : projection de puissance, Doomsday."],
          ] },
          { t: "p", text: "Les capitaux voyagent par jump drive (via cynos) et sont restreints en high-sec. Ils dominent mais sont des cibles prioritaires : on ne sort un capital qu'avec du soutien et un plan d'extraction." },
          { t: "warn", text: "Un capital mal soutenu est un cadeau pour l'ennemi (des milliards perdus). Ne te lance dans le jeu capital qu'au sein d'une organisation structurée." },
        ],
        questions: [
          { q: "Comment se déplacent les capitaux entre régions ?", options: ["Par les portes", "Par jump drive via cynos", "En warp seulement", "Par le marché"], answer: 1 },
          { q: "Le Rorqual est un capital…", options: ["de combat pur", "minier", "logistique", "de transport furtif"], answer: 1 },
          { q: "Sortir un capital sans soutien, c'est…", options: ["sans risque", "offrir des milliards à l'ennemi", "interdit", "obligatoire"], answer: 1 },
        ],
      },
      {
        id: "choisir",
        title: "Choisir le bon vaisseau",
        summary: "La coque suit l'objectif, pas l'inverse.",
        minutes: 6,
        blocks: [
          { t: "ol", items: [
            "Définis l'activité (explo, ratting, PvP solo, flotte, transport).",
            "Choisis la taille/rôle adapté (frégate explo, cruiser PvE, BS mission…).",
            "Vérifie tes skills/budget : un vaisseau que tu sais fitter et perdre.",
            "Adapte le fit au contexte (dégâts de la faction PvE, méta PvP local)." ,
          ] },
          { t: "p", text: "Évite le piège du 'plus gros = mieux'. Le bon vaisseau est celui que tu maîtrises, que tu peux te permettre de perdre, et qui colle à l'objectif du moment." },
          { t: "tip", text: "Entraîne ta reconnaissance des coques (sous-page Entraînement) : savoir lire un vaisseau ennemi — senseur, arme, tank — te dit s'il faut engager ou fuir." },
        ],
        questions: [
          { q: "Le meilleur vaisseau est…", options: ["toujours le plus gros", "celui adapté à l'objectif et que tu peux perdre", "le plus cher", "le plus rapide"], answer: 1 },
          { q: "Première question avant de choisir une coque ?", options: ["Sa couleur", "L'activité visée", "Son prix de revente", "Son nom"], answer: 1 },
        ],
      },
    ],
  },

  // ───────────────────────── 8. Interface & confort ──────────────────────────
  {
    id: "interface-qol",
    title: "Interface & confort",
    subtitle: "Overview, d-scan, bookmarks, flotte, raccourcis, compte",
    level: "Débutant",
    icon: Settings2,
    accent: "hsl(var(--fleur))",
    lessons: [
      {
        id: "overview",
        title: "Maîtriser l'Overview",
        summary: "Ton outil le plus important.",
        minutes: 6,
        blocks: [
          { t: "p", text: "L'Overview est la liste de tout ce qui t'entoure. Bien configuré, il te montre instantanément les menaces et masque le bruit ; mal configuré, il te fait mourir (cible cachée, surcharge d'infos)." },
          { t: "ul", items: [
            "Crée des onglets/presets par activité : PvP (vaisseaux/drones), Mining (astéroïdes), Travel (portes/stations).",
            "Colonnes utiles : distance, vitesse, type, tag, statut de sécurité.",
            "Codes couleur (standings) : repère amis/ennemis/neutres d'un coup d'œil.",
            "Importe un preset communautaire (ex. 'Z-S Overview') pour partir d'une base saine." ,
          ] },
          { t: "tip", text: "Aie un onglet qui montre TOUT (y compris débris/drones) : utile pour le loot et pour détecter ce qu'un preset filtré te cache." },
        ],
        questions: [
          { q: "Un bon Overview…", options: ["montre tout sans filtre toujours", "a des presets par activité (PvP, mining, travel)", "est inutile", "remplace le tank"], answer: 1 },
          { q: "Pourquoi garder un onglet 'tout afficher' ?", options: ["Pour le style", "Pour le loot et ne rien manquer", "Pour la taxe", "Pour le warp"], answer: 1 },
        ],
      },
      {
        id: "dscan-probe",
        title: "D-scan & fenêtre de sondes",
        summary: "Tes deux radars : large et précis.",
        minutes: 6,
        blocks: [
          { t: "kv", title: "Deux outils", rows: [
            ["D-scan (directionnel)", "Instantané, manuel, 14,3 UA, angle réglable. Repère les menaces/sondes."],
            ["Probe scanner", "Lance des sondes pour localiser précisément signatures et vaisseaux."],
          ] },
          { t: "ul", items: [
            "Règle l'angle du d-scan (5° pour pointer, 360° pour balayer).",
            "Apprends à 'd-scan' un site avant d'y warper (vaisseaux ? sondes ?).",
            "Les combat probes localisent les vaisseaux : si tu en vois, tu es chassé." ,
          ] },
          { t: "tip", text: "Associe une touche au d-scan et spamme-la : en PvP/explo, la fréquence de tes scans fait la différence entre voir venir et se faire surprendre." },
        ],
        questions: [
          { q: "Le d-scan est…", options: ["automatique et permanent", "instantané et manuel (à spammer)", "réservé au PvE", "un module à fitter"], answer: 1 },
          { q: "Des combat probes sur le d-scan signifient…", options: ["un cadeau", "que tu es chassé", "une panne", "rien"], answer: 1 },
        ],
      },
      {
        id: "bookmarks",
        title: "Bookmarks & safe spots",
        summary: "Des points de fuite et de contrôle.",
        minutes: 5,
        blocks: [
          { t: "p", text: "Un bookmark (BM) est un point sauvegardé de l'espace vers lequel warper. Les 'safe spots' (hors des objets, en plein vide) servent à se cacher, recharger, ou attendre ; les BM tactiques (perches, off-grids) donnent l'avantage en combat." },
          { t: "ul", items: [
            "Crée des safes en warpant entre deux célestes et en marquant un point à mi-chemin.",
            "Des 'perches' (150-200 km d'une porte/site) permettent d'observer avant d'entrer.",
            "Les BM se partagent (copier dans un dossier de flotte) — essentiel en groupe." ,
          ] },
          { t: "tip", text: "Avant toute activité risquée, prépare des safes et une perche : tu auras toujours un endroit où warper instantanément." },
        ],
        questions: [
          { q: "Un safe spot sert à…", options: ["miner plus vite", "se cacher/attendre hors des objets", "augmenter le DPS", "réduire la taxe"], answer: 1 },
          { q: "Une 'perche' permet de…", options: ["observer une porte/site avant d'entrer", "réparer", "scanner le marché", "gagner des LP"], answer: 0 },
        ],
      },
      {
        id: "flotte",
        title: "Fenêtre de flotte & broadcasts",
        summary: "Jouer ensemble efficacement.",
        minutes: 6,
        blocks: [
          { t: "p", text: "La fenêtre de flotte organise les membres en escadrons/ailes et permet les broadcasts : signaux standardisés (Align to, Warp to, Need reps, Target) que toute la flotte voit. C'est le langage opérationnel du jeu de groupe." },
          { t: "ul", items: [
            "'Broadcast for reps' : signale aux logis que tu prends des dégâts.",
            "'Align to' / 'Warp to' : le FC pilote les déplacements via broadcasts.",
            "Le 'watch list' permet aux logis de surveiller la vie des membres clés." ,
          ] },
          { t: "tip", text: "En flotte, comms claires + broadcasts = survie. Apprends à broadcaster reps dès que tu es 'primary'." },
        ],
        questions: [
          { q: "À quoi sert 'broadcast for reps' ?", options: ["Demander de l'ISK", "Signaler aux logis que tu prends des dégâts", "Lancer le warp", "Miner"], answer: 1 },
          { q: "Les broadcasts servent à…", options: ["décorer l'écran", "coordonner la flotte (align, warp, target, reps)", "réduire la taxe", "scanner"], answer: 1 },
        ],
      },
      {
        id: "raccourcis",
        title: "Raccourcis & confort de jeu",
        summary: "Gagner des secondes qui sauvent.",
        minutes: 5,
        blocks: [
          { t: "ul", items: [
            "Bind des touches : d-scan, approach (Q), orbit (W), keep at range (E), align.",
            "Active 'tactical overlay' pour visualiser distances/portées en 3D.",
            "Groupes de modules (F1-F8) et 'overheat' (clic droit/Alt) pour un boost temporaire (au prix d'usure).",
            "Le 'safety' (vert/jaune/rouge) empêche les actions illégales par erreur en high-sec." ,
          ] },
          { t: "tip", text: "L'overheat peut renverser un combat (plus de portée/DPS/rep quelques cycles) mais endommage les modules : à doser." },
          { t: "warn", text: "Garde le safety sur vert en high-sec pour ne pas devenir suspect/criminel par accident (et te faire CONCORD)." },
        ],
        questions: [
          { q: "L'overheat permet de…", options: ["réparer gratuitement", "booster temporairement un module (avec usure)", "warper plus loin", "miner"], answer: 1 },
          { q: "Le 'safety' sur vert…", options: ["empêche les actions illégales par erreur", "augmente le DPS", "réduit la taxe", "désactive l'overview"], answer: 0 },
        ],
      },
      {
        id: "compte-securite",
        title: "Sécuriser son compte & éviter les arnaques",
        summary: "La menace la plus coûteuse est hors combat.",
        minutes: 5,
        blocks: [
          { t: "p", text: "La plus grosse perte d'un capsuleer n'est pas un vaisseau, c'est un compte volé ou une arnaque. EVE est un monde de manipulation : protège-toi côté technique ET social." },
          { t: "ul", items: [
            "Active la 2FA et n'utilise jamais de sites/RMT tiers promettant de l'ISK gratuit.",
            "Arnaques classiques : contrats piégés (vérifie objet/quantité/prix), 'jita scams' au double-ou-rien, faux liens, usurpation de noms connus.",
            "Ne donne jamais tes identifiants ; CCP ne te les demandera jamais.",
            "Méfie-toi des 'deals' en convo privée et des recruteurs trop pressés." ,
          ] },
          { t: "warn", text: "Le RMT (achat d'ISK réel) et le partage de compte enfreignent l'EULA et mènent au ban. Reste dans les règles : c'est aussi protéger ta progression." },
        ],
        questions: [
          { q: "Meilleure protection technique du compte ?", options: ["Un bon vaisseau", "La 2FA", "Un implant", "Un safe spot"], answer: 1 },
          { q: "Face à un contrat au marché, il faut…", options: ["l'accepter vite", "vérifier objet, quantité et prix en détail", "le partager", "appeler CONCORD"], answer: 1 },
          { q: "Le RMT (achat d'ISK réel)…", options: ["est encouragé", "enfreint l'EULA et mène au ban", "donne des LP", "réduit la taxe"], answer: 1 },
        ],
      },
    ],
  },
];

/** Index plat des leçons (id → {track, lesson}). */
export const LESSON_INDEX = new Map(
  TRACKS.flatMap((tr) => tr.lessons.map((l) => [l.id, { track: tr, lesson: l }] as const)),
);

/** Toutes les leçons, à plat. */
export const ALL_LESSONS = TRACKS.flatMap((t) => t.lessons);

/** Nombre total de leçons du curriculum. */
export const TOTAL_LESSONS = ALL_LESSONS.length;

/**
 * Questions d'une leçon enrichies de leur clé i18n (`academy.lesson.<id>.qN`),
 * pour que le moteur de quiz affiche le texte traduit (et non le français source).
 */
export function questionsForLesson(lessonId: string): Question[] {
  const lesson = LESSON_INDEX.get(lessonId)?.lesson;
  if (!lesson) return [];
  return lesson.questions.map((q, i) => ({ ...q, tk: `academy.lesson.${lessonId}.q${i}` }));
}

/** Toutes les questions du curriculum, avec leur clé i18n. */
export const ALL_QUESTIONS: Question[] = TRACKS.flatMap((tr) =>
  tr.lessons.flatMap((l) =>
    l.questions.map((q, i) => ({ ...q, tk: `academy.lesson.${l.id}.q${i}` })),
  ),
);

/** Questions d'un cursus (toutes ses leçons), avec leur clé i18n. */
export function questionsForTrack(trackId: string): Question[] {
  const track = TRACKS.find((t) => t.id === trackId);
  if (!track) return [];
  return track.lessons.flatMap((l) =>
    l.questions.map((q, i) => ({ ...q, tk: `academy.lesson.${l.id}.q${i}` })),
  );
}
