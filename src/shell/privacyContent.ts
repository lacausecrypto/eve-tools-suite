import type { Language } from "@/core/settings";

export interface PrivacySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface PrivacyDoc {
  updated: string;
  controller: string[];
  intro: string;
  sections: PrivacySection[];
}

/**
 * Contenu de la politique de confidentialité (RGPD), bilingue, rendu **dans
 * l'app** (modal). Doit rester aligné avec `PRIVACY.md` (version publique du dépôt).
 */
export const PRIVACY_CONTENT: Record<Language, PrivacyDoc> = {
  fr: {
    updated: "Dernière mise à jour : 7 juin 2026",
    controller: [
      "Responsable du traitement : lacausecrypto.",
      "Contact : lacausecrypto@gmail.com",
    ],
    intro:
      "L'application fonctionne localement sur votre machine. Les données de jeu EVE et les secrets SSO ne quittent jamais votre appareil. Seules des statistiques d'usage anonymes et facultatives peuvent être transmises, et uniquement avec votre consentement explicite.",
    sections: [
      {
        heading: "1. Données collectées (analytics — opt-in)",
        paragraphs: [
          "Si, et seulement si, vous acceptez la bannière de consentement, l'application envoie des statistiques d'usage anonymes via PostHog :",
        ],
        bullets: [
          "ouverture de l'application (version, plateforme, langue, durée de session) ;",
          "quels outils sont ouverts et à quelle fréquence ;",
          "actions clés (ex. « fit généré ») — sans aucun contenu.",
        ],
      },
      {
        heading: "2. Données jamais collectées",
        paragraphs: [
          "Nom ou ID de personnage EVE, e-mail, jetons SSO, valeurs ISK, contenu de vos saisies. Chaque événement porte un identifiant aléatoire local, non rattaché à votre identité. Aucun cookie, aucune capture automatique, aucun enregistrement de session.",
        ],
      },
      {
        heading: "3. Base légale et finalité",
        paragraphs: [
          "Base légale : votre consentement (RGPD art. 6.1.a), révocable à tout moment.",
          "Finalité : comprendre quels outils sont utiles pour prioriser les améliorations. Aucune publicité, aucune revente, aucun profilage.",
        ],
      },
      {
        heading: "4. Hébergement et transferts",
        paragraphs: [
          "Les statistiques sont traitées par PostHog Cloud EU, données hébergées dans l'Union européenne. Aucun transfert hors UE. PostHog agit comme sous-traitant.",
        ],
      },
      {
        heading: "5. Conservation",
        paragraphs: [
          "Les statistiques anonymes sont conservées selon la politique de rétention de PostHog. N'étant rattachées à aucune identité, elles ne peuvent être reliées à une personne.",
        ],
      },
      {
        heading: "6. Vos droits",
        bullets: [
          "Retirer votre consentement : Réglages → Données & confidentialité → désactiver « Statistiques d'utilisation ». La collecte cesse immédiatement et l'identifiant local est réinitialisé.",
          "Refuser dès le départ : « Refuser » sur la bannière.",
          "Demander l'accès ou l'effacement (en pratique limité, les données étant anonymes), ou saisir votre autorité de protection des données (la CNIL en France), en nous contactant.",
        ],
      },
    ],
  },
  en: {
    updated: "Last updated: 7 June 2026",
    controller: [
      "Data controller: lacausecrypto.",
      "Contact: lacausecrypto@gmail.com",
    ],
    intro:
      "The app runs locally on your machine. EVE game data and SSO secrets never leave your device. Only anonymous, optional usage statistics may be sent, and only with your explicit consent.",
    sections: [
      {
        heading: "1. Data collected (analytics — opt-in)",
        paragraphs: [
          "If, and only if, you accept the consent banner, the app sends anonymous usage statistics via PostHog:",
        ],
        bullets: [
          "app launch (version, platform, language, session length);",
          "which tools are opened and how often;",
          "key actions (e.g. “fit generated”) — without any content.",
        ],
      },
      {
        heading: "2. Data never collected",
        paragraphs: [
          "EVE character name or ID, e-mail, SSO tokens, ISK values, the content you type. Each event carries a random local identifier, not linked to your identity. No cookies, no automatic capture, no session recording.",
        ],
      },
      {
        heading: "3. Legal basis and purpose",
        paragraphs: [
          "Legal basis: your consent (GDPR art. 6(1)(a)), revocable at any time.",
          "Purpose: understand which tools are useful to prioritize improvements. No advertising, no resale, no profiling.",
        ],
      },
      {
        heading: "4. Hosting and transfers",
        paragraphs: [
          "Statistics are processed by PostHog Cloud EU, data hosted in the European Union. No transfer outside the EU. PostHog acts as a data processor.",
        ],
      },
      {
        heading: "5. Retention",
        paragraphs: [
          "Anonymous statistics are kept per PostHog's retention policy. As they are tied to no identity, they cannot be linked back to a person.",
        ],
      },
      {
        heading: "6. Your rights",
        bullets: [
          "Withdraw consent: Settings → Data & privacy → turn off “Usage statistics”. Collection stops immediately and the local identifier is reset.",
          "Decline upfront: “Decline” on the banner.",
          "Request access or erasure (limited in practice, as data is anonymous), or lodge a complaint with your data protection authority, by contacting us.",
        ],
      },
    ],
  },
};
