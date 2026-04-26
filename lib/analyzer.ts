// Import AND re-export from shared types so the rest of this file can use them
import type { Category, AnalyzedParagraph } from "@/lib/types";
export type { Category, AnalyzedParagraph };

// "termination" is handled under "control" for local scoring; add it as alias
const SEVERITY_PATTERNS: Partial<Record<Category, { high: string[]; medium: string[]; low: string[] }>> = {
  privacy: {
    high: [
      "sell your data",
      "share with third parties",
      "advertising partners",
      "track",
      "collect",
      "personally identifiable",
      "device information",
      "browsing history",
      "location data",
      "behavioral data",
      "demographic information",
      "biometric",
      "precise location",
      "cross-site tracking",
    ],
    medium: [
      "cookies",
      "analytics",
      "aggregated data",
      "improve our services",
      "usage data",
      "log data",
      "service providers",
    ],
    low: ["you can opt out", "your privacy", "we respect", "privacy choices", "delete your data"],
  },
  control: {
    high: [
      "at our sole discretion",
      "we reserve the right",
      "without notice",
      "we may modify",
      "we may terminate",
      "without prior notice",
      "unilaterally",
      "at any time",
      "without liability",
      "in our absolute",
      "without cause",
      "suspend or terminate",
    ],
    medium: [
      "we may update",
      "from time to time",
      "continued use constitutes acceptance",
      "subject to change",
      "may change",
    ],
    low: ["you may cancel", "you have the right", "upon request", "at your option"],
  },
  liability: {
    high: [
      "not liable",
      "no warranty",
      "as is",
      "limitation of liability",
      "indemnify",
      "hold harmless",
      "waive your right",
      "binding arbitration",
      "class action waiver",
      "no responsibility",
      "disclaim all",
      "expressly disclaim",
      "in no event",
      "maximum extent permitted",
    ],
    medium: [
      "best efforts",
      "reasonable measures",
      "commercially reasonable",
      "not responsible for",
      "limited liability",
    ],
    low: ["we will notify", "we are committed", "we take responsibility"],
  },
  content_rights: {
    high: [
      "irrevocable",
      "perpetual",
      "worldwide license",
      "sublicensable",
      "royalty-free",
      "transferable license",
      "derivative works",
      "any purpose",
      "without compensation",
      "in any media",
      "all formats",
      "modify your content",
    ],
    medium: ["license to use", "display your content", "promote", "feature your content", "non-exclusive license"],
    low: ["you retain ownership", "your content remains yours", "you own your content"],
  },
  payments: {
    high: [
      "automatic renewal",
      "non-refundable",
      "price changes without notice",
      "charged immediately",
      "no refund",
      "automatically charged",
      "auto-renew",
      "autorenewal",
      "prepaid fees",
    ],
    medium: [
      "recurring billing",
      "cancel before",
      "trial period",
      "subscription fee",
      "billing cycle",
    ],
    low: ["full refund", "prorated", "cancel anytime", "money-back", "30-day refund"],
  },
  other: {
    high: ["governing law", "jurisdiction", "dispute resolution", "mandatory arbitration", "waive jury trial", "class action"],
    medium: ["herein", "notwithstanding", "pursuant", "thereof", "whereas", "heretofore", "aforementioned"],
    low: ["contact us", "please read", "thank you"],
  },
};

const LEGAL_JARGON = [
  "herein",
  "notwithstanding",
  "pursuant",
  "thereof",
  "whereas",
  "heretofore",
  "aforementioned",
  "indemnification",
  "arbitration",
  "jurisdiction",
  "hereof",
  "hereunder",
  "expressly",
  "construed",
  "supersedes",
];

const TRANSLATIONS_EN: Partial<Record<Category, Record<number, string>>> & Record<"other", Record<number, string>> = {
  privacy: {
    5: "They're harvesting everything about you and selling it to whoever pays.",
    4: "Your data is their product. You just happen to also use the app.",
    3: "They're collecting more than they need, but it could be worse.",
    2: "Standard tracking stuff. Not great, not terrible.",
    1: "They're being surprisingly transparent about your data.",
  },
  control: {
    5: "They can change anything, anytime, and you already agreed to it.",
    4: "The rules apply to you. They can rewrite them whenever they want.",
    3: "They have a lot of flexibility here. You don't.",
    2: "Fairly standard terms. The power balance is tilted, but slightly.",
    1: "You actually have some control here. That's refreshing.",
  },
  liability: {
    5: "If anything goes wrong, it's your problem. You can't even sue.",
    4: "They've legally shielded themselves from basically everything.",
    3: "They limit their responsibility significantly. Typical but not great.",
    2: "Some liability protections, but within reason.",
    1: "They actually take some responsibility. That's unusual.",
  },
  content_rights: {
    5: "Everything you create belongs to them. Forever. Everywhere. For free.",
    4: "They get a very broad license to do almost anything with your content.",
    3: "They need rights to display your content, but the scope is wide.",
    2: "Basic content license to make the service work. Reasonable.",
    1: "Your stuff stays yours. They're being honest about it.",
  },
  payments: {
    5: "They'll charge you and there's almost no way to get your money back.",
    4: "Auto-renew is on by default and refunds are basically impossible.",
    3: "Watch out for the renewal terms. They're counting on you forgetting.",
    2: "Standard billing terms. Just keep track of your renewal dates.",
    1: "Fair billing practices. You can cancel without a fight.",
  },
  other: {
    5: "This clause exists purely to protect them at your expense.",
    4: "Heavy-handed legal language designed to minimize their obligations.",
    3: "Boilerplate legalese, but leaning in their favor.",
    2: "Standard legal stuff. Nothing unusual.",
    1: "Straightforward and reasonable. If only they were all like this.",
  },
};

const TRANSLATIONS_ES: Partial<Record<Category, Record<number, string>>> & Record<"other", Record<number, string>> = {
  privacy: {
    5: "Están cosechando todo sobre vos y vendiéndolo al mejor postor.",
    4: "Tus datos son su producto. Vos solo usás la app de paso.",
    3: "Están recolectando más de lo necesario, pero podría ser peor.",
    2: "Rastreo estándar. No es genial, pero tampoco terrible.",
    1: "Sorprendentemente transparentes sobre tus datos.",
  },
  control: {
    5: "Pueden cambiar cualquier cosa, cuando quieran, y ya aceptaste.",
    4: "Las reglas son para vos. Ellos las reescriben cuando les conviene.",
    3: "Tienen mucha flexibilidad acá. Vos no.",
    2: "Términos bastante estándar. El balance está inclinado, pero poco.",
    1: "Realmente tenés algo de control acá. Qué refrescante.",
  },
  liability: {
    5: "Si algo sale mal, es tu problema. Ni siquiera podés demandar.",
    4: "Se blindaron legalmente contra básicamente todo.",
    3: "Limitan su responsabilidad significativamente. Típico pero no bueno.",
    2: "Algunas protecciones de responsabilidad, pero razonables.",
    1: "Asumen algo de responsabilidad. Eso es inusual.",
  },
  content_rights: {
    5: "Todo lo que creás les pertenece. Para siempre. En todo el mundo. Gratis.",
    4: "Obtienen una licencia muy amplia para hacer casi cualquier cosa con tu contenido.",
    3: "Necesitan derechos para mostrar tu contenido, pero el alcance es amplio.",
    2: "Licencia básica de contenido para que el servicio funcione. Razonable.",
    1: "Tus cosas siguen siendo tuyas. Son honestos al respecto.",
  },
  payments: {
    5: "Te van a cobrar y casi no hay forma de recuperar tu dinero.",
    4: "La renovación automática está activada por defecto y los reembolsos son casi imposibles.",
    3: "Cuidado con los términos de renovación. Cuentan con que te olvides.",
    2: "Términos de facturación estándar. Solo controlá tus fechas de renovación.",
    1: "Prácticas de facturación justas. Podés cancelar sin drama.",
  },
  other: {
    5: "Esta cláusula existe puramente para protegerlos a costa tuya.",
    4: "Lenguaje legal agresivo diseñado para minimizar sus obligaciones.",
    3: "Jerga legal estándar, pero inclinada a su favor.",
    2: "Cosas legales estándar. Nada inusual.",
    1: "Directo y razonable. Si tan solo todos fueran así.",
  },
};

function getTranslations(language: string) {
  return language === "es" ? TRANSLATIONS_ES : TRANSLATIONS_EN;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function analyzeParagraph(text: string, language: string = "en"): AnalyzedParagraph {
  const lower = text.toLowerCase();
  const categoryScores: Record<Category, number> = {
    privacy: 0,
    control: 0,
    liability: 0,
    content_rights: 0,
    payments: 0,
    termination: 0,
    other: 0,
  };

  let highMatches = 0;
  let mediumMatches = 0;
  let lowMatches = 0;
  const allMatches: string[] = [];

  for (const [cat, levels] of Object.entries(SEVERITY_PATTERNS) as [Category, { high: string[]; medium: string[]; low: string[] }][]) {
    for (const kw of levels.high) {
      if (lower.includes(kw)) {
        categoryScores[cat] += 3;
        highMatches++;
        allMatches.push(kw);
      }
    }
    for (const kw of levels.medium) {
      if (lower.includes(kw)) {
        categoryScores[cat] += 1.5;
        mediumMatches++;
        allMatches.push(kw);
      }
    }
    for (const kw of levels.low) {
      if (lower.includes(kw)) {
        categoryScores[cat] -= 1;
        lowMatches++;
        allMatches.push(kw);
      }
    }
  }

  // Jargon density boost
  let jargonCount = 0;
  for (const j of LEGAL_JARGON) {
    if (lower.includes(j)) jargonCount++;
  }
  const jargonBoost = Math.min(jargonCount * 0.3, 1.5);

  // Length modifier — longer paragraphs are more suspicious
  const lengthModifier = text.length > 400 ? 0.5 : text.length > 200 ? 0.2 : 0;

  // Raw severity score
  let rawScore = highMatches * 2 + mediumMatches * 1 - lowMatches * 1.5 + jargonBoost + lengthModifier;

  // Map to 1-5
  let severity: 1 | 2 | 3 | 4 | 5;
  if (rawScore >= 6) severity = 5;
  else if (rawScore >= 4) severity = 4;
  else if (rawScore >= 2) severity = 3;
  else if (rawScore >= 0.5) severity = 2;
  else severity = 1;

  // Find dominant category
  let dominantCategory: Category = "other";
  let maxScore = 0;
  for (const [cat, score] of Object.entries(categoryScores) as [Category, number][]) {
    if (score > maxScore) {
      maxScore = score;
      dominantCategory = cat;
    }
  }

  const translations = getTranslations(language);
  const translation = (translations[dominantCategory] ?? translations["other"])[severity];

  return {
    text,
    severity,
    category: dominantCategory,
    translation,
    matches: [...new Set(allMatches)].slice(0, 5),
  };
}

export function analyzeText(text: string, language: string = "en"): AnalyzedParagraph[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  return paragraphs.map((p) => analyzeParagraph(p, language));
}

export function computeDamageScore(paragraphs: AnalyzedParagraph[]): number {
  return paragraphs.reduce((sum, p) => sum + (p.severity - 1) * 25, 0);
}

export function getVerdictMessage(totalDamage: number): string {
  if (totalDamage < 200) return "This one's actually not terrible. Rare.";
  if (totalDamage < 500) return "You gave away more than you think.";
  if (totalDamage < 900) return "You signed away a surprising amount. But the app has a great UI, so.";
  return "You basically signed a blank check. But hey, at least the app is free.";
}
