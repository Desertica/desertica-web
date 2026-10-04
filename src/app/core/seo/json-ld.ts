export type JsonLd = Record<string, unknown>;

const CONTEXT = 'https://schema.org';

export function organizationLd(input: {
  name: string;
  url: string;
  logo: string;
  legalName?: string;
  email?: string;
  phone?: string;
  sameAs: readonly string[];
}): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'TravelAgency',
    '@id': `${input.url}/#organization`,
    name: input.name,
    url: input.url,
    logo: input.logo,
    ...(input.legalName ? { legalName: input.legalName } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.phone ? { telephone: input.phone } : {}),
    ...(input.sameAs.length ? { sameAs: input.sameAs } : {}),
    areaServed: ['Ica', 'Huacachina', 'Paracas', 'Nazca'],
  };
}

export function touristTripLd(input: {
  name: string;
  description: string;
  url: string;
  image: readonly string[];
  organizationId: string;
  price: number;
  currency: string;
  inLanguage: readonly string[];
}): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'TouristTrip',
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    provider: { '@id': input.organizationId },
    inLanguage: input.inLanguage,
    offers: {
      '@type': 'Offer',
      url: input.url,
      price: input.price,
      priceCurrency: input.currency,
      availability: `${CONTEXT}/InStock`,
      seller: { '@id': input.organizationId },
    },
  };
}

export function breadcrumbLd(items: readonly { name: string; url: string }[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Only for questions that are visible on the page: Google rejects markup for hidden content. */
export function faqLd(questions: readonly { question: string; answer: string }[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: questions.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

/** Serializes for an inline `<script>`: `<` is escaped so a value can never close the tag. */
export function serializeLd(value: JsonLd): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
