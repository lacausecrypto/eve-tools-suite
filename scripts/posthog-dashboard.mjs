#!/usr/bin/env node
/**
 * Crée le dashboard produit « Eve-Tools » dans PostHog (insights + tableau de
 * bord) via l'API — « dashboard as code », reproductible et versionné.
 *
 * Prérequis : une **Personal API Key** PostHog (≠ clé projet `phc_`) avec les
 * scopes `insight:write` et `dashboard:write`. Crée-la dans PostHog :
 *   Settings → Personal API keys → New key (scopes insight + dashboard).
 *
 * Usage :
 *   POSTHOG_PERSONAL_KEY=phx_xxxx node scripts/posthog-dashboard.mjs
 * Options (env) :
 *   POSTHOG_API_HOST   (défaut https://eu.posthog.com)
 *   POSTHOG_PROJECT_ID (défaut : 1er projet du compte)
 *   POSTHOG_DASH_NAME  (défaut « Eve-Tools — Vue produit »)
 *   FORCE=1            (recrée même si un dashboard du même nom existe)
 */

const HOST = (process.env.POSTHOG_API_HOST ?? "https://eu.posthog.com").replace(/\/$/, "");
const KEY = process.env.POSTHOG_PERSONAL_KEY;
const DASH_NAME = process.env.POSTHOG_DASH_NAME ?? "Eve-Tools — Vue produit";
const FORCE = process.env.FORCE === "1";
const RANGE = "-30d";

if (!KEY) {
  console.error("✖ POSTHOG_PERSONAL_KEY manquante (Personal API Key phx_…, scopes insight+dashboard).");
  process.exit(1);
}

const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function api(path, init = {}) {
  const res = await fetch(`${HOST}/api${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

// --- helpers de construction (schéma « query » moderne : InsightVizNode) ------
/** Une série d'événement pour TrendsQuery/FunnelsQuery. */
const ev = (event, math = "total") => ({ kind: "EventsNode", event, name: event, math });

/** TrendsQuery enveloppée. `events` = tableau de séries `ev(...)`. */
const trend = (events, opts = {}) => {
  const { display = "ActionsLineGraph", breakdown, interval = "day" } = opts;
  return {
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: events,
      interval,
      dateRange: { date_from: RANGE },
      trendsFilter: { display },
      ...(breakdown
        ? { breakdownFilter: { breakdown, breakdown_type: "event" } }
        : {}),
    },
  };
};

/** FunnelsQuery enveloppée (étapes ordonnées). */
const funnel = (events) => ({
  kind: "InsightVizNode",
  source: {
    kind: "FunnelsQuery",
    series: events,
    dateRange: { date_from: RANGE },
    funnelsFilter: { funnelVizType: "steps" },
  },
});

/** RetentionQuery hebdomadaire sur un événement. */
const retention = (event) => ({
  kind: "InsightVizNode",
  source: {
    kind: "RetentionQuery",
    dateRange: { date_from: RANGE },
    retentionFilter: {
      period: "Week",
      retentionType: "retention_first_time",
      targetEntity: { id: event, type: "events", name: event },
      returningEntity: { id: event, type: "events", name: event },
    },
  },
});

async function main() {
  // 1) Projet cible
  let projectId = process.env.POSTHOG_PROJECT_ID;
  if (!projectId) {
    const projects = await api("/projects/");
    const first = projects?.results?.[0];
    if (!first) throw new Error("Aucun projet trouvé pour cette clé.");
    projectId = first.id;
    console.log(`• Projet : ${first.name} (id ${projectId})`);
  }

  // 2) Anti-doublon
  const existing = await api(`/projects/${projectId}/dashboards/?search=${encodeURIComponent(DASH_NAME)}`);
  const dup = existing?.results?.find((d) => d.name === DASH_NAME);
  if (dup && !FORCE) {
    console.error(`✖ Un dashboard « ${DASH_NAME} » existe déjà (id ${dup.id}). Relance avec FORCE=1 pour en créer un nouveau.`);
    process.exit(1);
  }

  // 3) Dashboard
  const dash = await api(`/projects/${projectId}/dashboards/`, {
    method: "POST",
    body: JSON.stringify({
      name: DASH_NAME,
      description: "Métriques produit Eve-Tools (anonymes, opt-in). Généré par scripts/posthog-dashboard.mjs.",
    }),
  });
  console.log(`• Dashboard créé : ${dash.id}`);

  // 4) Insights — chaque entrée = { name, description, filters }
  const ACTIONS = [
    "fit_generated", "fit_analyzed", "appraisal_run", "abyssal_evaluated",
    "lp_store_computed", "activity_loot_valued", "mining_session_started",
    "trade_station_scanned", "loss_analyzed", "pirate_analyzed",
    "market_item_viewed", "skills_esi_import", "industry_esi_import",
  ];

  const insights = [
    {
      name: "Utilisateurs actifs / jour (DAU)",
      description: "Personnes uniques (anonymes) lançant l'app par jour.",
      query: trend([ev("app_opened", "dau")]),
    },
    {
      name: "Lancements d'app / jour",
      description: "Nombre de démarrages de l'application.",
      query: trend([ev("app_opened")]),
    },
    {
      name: "Total lancements (30 j)",
      description: "Volume agrégé d'ouvertures d'app sur la période.",
      query: trend([ev("app_opened")], { display: "BoldNumber" }),
    },
    {
      name: "Outils les plus ouverts (30 j)",
      description: "Classement des outils par nombre d'ouvertures.",
      query: trend([ev("tool_opened")], { display: "ActionsBarValue", breakdown: "tool" }),
    },
    {
      name: "Ouvertures d'outils dans le temps",
      description: "Tendance d'usage par outil.",
      query: trend([ev("tool_opened")], { breakdown: "tool" }),
    },
    {
      name: "Répartition par langue",
      description: "Langue d'interface des sessions.",
      query: trend([ev("app_opened")], { display: "ActionsPie", breakdown: "language" }),
    },
    {
      name: "Plateforme (desktop / web)",
      description: "Runtime d'exécution.",
      query: trend([ev("app_opened")], { display: "ActionsPie", breakdown: "runtime" }),
    },
    {
      name: "Actions clés / jour",
      description: "Volume des actions métier (toutes confondues).",
      query: trend(ACTIONS.map((id) => ev(id))),
    },
    {
      name: "Actions clés — répartition (30 j)",
      description: "Quelles actions métier dominent l'usage.",
      query: trend(ACTIONS.map((id) => ev(id)), { display: "ActionsBarValue" }),
    },
    {
      name: "Fits générés par rôle",
      description: "Rôles demandés au générateur de fit (ratting, pvp…).",
      query: trend([ev("fit_generated")], { display: "ActionsBarValue", breakdown: "role" }),
    },
    {
      name: "Imports ESI authentifiés / jour",
      description: "Engagement des fonctions connectées (skills + industry).",
      query: trend([ev("skills_esi_import"), ev("industry_esi_import")]),
    },
    {
      name: "Funnel d'activation",
      description: "Lancer l'app → ouvrir un outil → générer un fit.",
      query: funnel([ev("app_opened"), ev("tool_opened"), ev("fit_generated")]),
    },
    {
      name: "Rétention hebdomadaire",
      description: "Les utilisateurs reviennent-ils semaine après semaine ?",
      query: retention("app_opened"),
    },
  ];

  // 5) Création, chaque insight rattaché au dashboard
  let n = 0;
  for (const ins of insights) {
    await api(`/projects/${projectId}/insights/`, {
      method: "POST",
      body: JSON.stringify({
        name: ins.name,
        description: ins.description,
        query: ins.query,
        dashboards: [dash.id],
        saved: true,
      }),
    });
    n++;
    console.log(`  ✓ ${n}/${insights.length} — ${ins.name}`);
  }

  const url = `${HOST}/project/${projectId}/dashboard/${dash.id}`;
  console.log(`\n✅ Dashboard « ${DASH_NAME} » prêt avec ${n} insights.\n   ${url}`);
}

main().catch((e) => {
  console.error("\n✖ Échec :", e.message);
  process.exit(1);
});
