import ecommerceImprovement from "./ecommerce-improvement";
import agencyClientReports from "./agency-client-reports";
import wordpressSecurity from "./wordpress-security";

export type CaseStudyLocale = "fa" | "en";

type CaseStudyTranslation = {
  title: string;
  client: string;
  problem: string;
  findings: string[];
  recommendations: string[];
  result: string;
  scoreBefore: number;
  scoreAfter: number;
  cta: string;
};

export type CaseStudySeed = {
  slug: string;
  updatedAt: string;
  fa: CaseStudyTranslation;
  en: CaseStudyTranslation;
};

export type CaseStudy = {
  slug: string;
  updatedAt: string;
  title: string;
  client: string;
  problem: string;
  findings: string[];
  recommendations: string[];
  result: string;
  scoreBefore: number;
  scoreAfter: number;
  cta: string;
};

const caseStudySeeds: CaseStudySeed[] = [
  ecommerceImprovement,
  agencyClientReports,
  wordpressSecurity
];

function toCaseStudyLocalized(study: CaseStudySeed, locale: CaseStudyLocale): CaseStudy {
  const localized = study[locale];
  return {
    slug: study.slug,
    updatedAt: study.updatedAt,
    title: localized.title,
    client: localized.client,
    problem: localized.problem,
    findings: localized.findings,
    recommendations: localized.recommendations,
    result: localized.result,
    scoreBefore: localized.scoreBefore,
    scoreAfter: localized.scoreAfter,
    cta: localized.cta
  };
}

export function getCaseStudies(locale: CaseStudyLocale): CaseStudy[] {
  return caseStudySeeds.map((study) => toCaseStudyLocalized(study, locale));
}

export function getCaseStudyBySlug(slug: string, locale: CaseStudyLocale): CaseStudy | undefined {
  const study = caseStudySeeds.find((s) => s.slug === slug);
  if (!study) return undefined;
  return toCaseStudyLocalized(study, locale);
}

export function getCaseStudySlugs(): string[] {
  return caseStudySeeds.map((study) => study.slug);
}

export function getCaseStudyUpdatedAtMap(): Map<string, string> {
  return new Map(caseStudySeeds.map((study) => [study.slug, study.updatedAt]));
}
