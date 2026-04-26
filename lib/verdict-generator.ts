import type { AnalyzedParagraph } from "@/lib/types";
import type { Language } from "@/lib/translations";

const VERDICTS = {
  en: {
    extreme: [
      "This T&C was written by someone who believes 'might makes right' — and they have very big might.",
      "They're asking for your soul, your data, and your firstborn. Legally binding.",
      "Even Machiavelli would say, 'Okay, that's a bit much.'",
      "This reads like a ransom note written in legalese.",
      "Pretty sure they trademarked the concept of 'unfair.'",
      "Your rights? They exist, technically. Just not in this document.",
      "This is what happens when lawyers and supervillains collaborate.",
    ],
    veryBadPredatory: "This T&C has more predatory clauses than a nature documentary.",
    veryBad: [
      "They're not even hiding it anymore. It's predatory and they know it.",
      "Your rights were popular until about paragraph 2.",
      "This is what 'hidden in plain sight' looks like.",
      "They drafted this with one hand tied behind their back. Still won.",
      "Your interests and theirs have a 'slight' alignment issue.",
    ],
    badTermination: "They reserved the right to fire you whenever. Which is convenient.",
    badPayments: "Your wallet just shivered. For good reason.",
    bad: [
      "This T&C reads like they're asking for permission to do whatever they want.",
      "They wrote this assuming you wouldn't actually read it. (You didn't, did you?)",
      "Neutral? No. Fair? Also no. Legal? Yeah, apparently.",
      "They're not being evil, just... opportunistic.",
      "Your data is a commodity here. You're just the vessel.",
    ],
    concerningBad: "Some rough edges, but they didn't go full dark mode.",
    concerning: [
      "Read carefully. Some clauses are sneakier than others.",
      "It's not all bad, but it's definitely not all good.",
      "They're protecting themselves more than you. Shocking, I know.",
      "Fair is a spectrum. This ain't in the middle.",
      "They're nice until they're not. These terms explain the 'not.'",
    ],
    mild: [
      "Could be worse. But it could also be better.",
      "They're looking out for number one: themselves.",
      "Pretty standard corporate caution. Nothing fancy.",
      "Your legal standing is... okay. Room to improve, though.",
      "Not evil, just protective. Very protective.",
    ],
    harmless: [
      "Surprisingly reasonable. Did they forget to be shifty?",
      "This is almost... fair? What timeline is this?",
      "They're looking out for both of you. How refreshing.",
      "No red flags. Just green ones. Weird.",
      "This company seems to like its users. Unprecedented.",
    ],
  },
  es: {
    extreme: [
      "Estos T&C fueron escritos por alguien que cree que 'el poder es derecho' — y tienen mucho poder.",
      "Te piden tu alma, tus datos y tu primogénito. Legalmente vinculante.",
      "Hasta Maquiavelo diría: 'Bueno, eso es demasiado.'",
      "Esto se lee como una nota de rescate escrita en jerga legal.",
      "Estoy bastante seguro de que patentaron el concepto de 'injusto.'",
      "¿Tus derechos? Existen, técnicamente. Solo que no en este documento.",
      "Esto es lo que pasa cuando abogados y supervillanos colaboran.",
    ],
    veryBadPredatory: "Estos T&C tienen más cláusulas predatorias que un documental de naturaleza.",
    veryBad: [
      "Ya ni lo esconden. Es predatorio y lo saben.",
      "Tus derechos eran populares hasta el párrafo 2.",
      "Esto es lo que significa 'oculto a plena vista.'",
      "Redactaron esto con una mano atada. Igual ganaron.",
      "Tus intereses y los de ellos tienen un 'leve' problema de alineación.",
    ],
    badTermination: "Se reservaron el derecho de echarte cuando quieran. Conveniente.",
    badPayments: "Tu billetera acaba de temblar. Con razón.",
    bad: [
      "Estos T&C se leen como si pidieran permiso para hacer lo que quieran.",
      "Escribieron esto asumiendo que no lo leerías. (No lo hiciste, ¿verdad?)",
      "¿Neutral? No. ¿Justo? Tampoco. ¿Legal? Sí, aparentemente.",
      "No están siendo malvados, solo... oportunistas.",
      "Tus datos son mercancía aquí. Tú solo eres el envase.",
    ],
    concerningBad: "Algunos bordes ásperos, pero no llegaron al modo oscuro total.",
    concerning: [
      "Lee con cuidado. Algunas cláusulas son más escurridizas que otras.",
      "No todo es malo, pero definitivamente no todo es bueno.",
      "Se protegen a sí mismos más que a ti. Sorprendente, lo sé.",
      "Lo justo es un espectro. Esto no está en el medio.",
      "Son amables hasta que no lo son. Estos términos explican el 'no lo son.'",
    ],
    mild: [
      "Podría ser peor. Pero también podría ser mejor.",
      "Están cuidando al número uno: ellos mismos.",
      "Precaución corporativa bastante estándar. Nada especial.",
      "Tu posición legal está... bien. Hay margen de mejora.",
      "No son malvados, solo protectores. Muy protectores.",
    ],
    harmless: [
      "Sorprendentemente razonable. ¿Se olvidaron de ser turbios?",
      "Esto es casi... ¿justo? ¿En qué línea temporal estamos?",
      "Están cuidando a ambos. Qué refrescante.",
      "Sin banderas rojas. Solo verdes. Raro.",
      "Esta empresa parece querer a sus usuarios. Sin precedentes.",
    ],
  },
};

export function generateFunnyVerdict(
  paragraphs: AnalyzedParagraph[],
  totalDamage: number,
  language: Language = "en"
): string {
  const v = VERDICTS[language];
  const severity5 = paragraphs.filter((p) => p.severity === 5).length;
  const severity4 = paragraphs.filter((p) => p.severity === 4).length;

  const categories = {
    privacy: paragraphs.filter((p) => p.category === "privacy").length,
    control: paragraphs.filter((p) => p.category === "control").length,
    liability: paragraphs.filter((p) => p.category === "liability").length,
    content_rights: paragraphs.filter((p) => p.category === "content_rights").length,
    payments: paragraphs.filter((p) => p.category === "payments").length,
    termination: paragraphs.filter((p) => p.category === "termination").length,
  };

  const dominantCategory = Object.entries(categories).sort(([, a], [, b]) => b - a)[0]?.[0];

  if (totalDamage > 500) {
    return v.extreme[Math.floor(Math.random() * v.extreme.length)];
  }

  if (totalDamage > 350) {
    if (severity5 >= 3) {
      return v.veryBadPredatory;
    }
    return v.veryBad[Math.floor(Math.random() * v.veryBad.length)];
  }

  if (totalDamage > 250) {
    if (dominantCategory === "termination") {
      return v.badTermination;
    }
    if (dominantCategory === "payments") {
      return v.badPayments;
    }
    return v.bad[Math.floor(Math.random() * v.bad.length)];
  }

  if (totalDamage > 150) {
    if (severity4 >= 2) {
      return v.concerningBad;
    }
    return v.concerning[Math.floor(Math.random() * v.concerning.length)];
  }

  if (totalDamage > 75) {
    return v.mild[Math.floor(Math.random() * v.mild.length)];
  }

  return v.harmless[Math.floor(Math.random() * v.harmless.length)];
}
