import { breadcrumbLd, faqLd, organizationLd, serializeLd, touristTripLd } from './json-ld';

describe('json-ld builders', () => {
  it('describes a tour as a TouristTrip with an Offer', () => {
    const trip = touristTripLd({
      name: 'Dune buggy',
      description: 'Ride the dunes',
      url: 'https://d.pe/tours/dune-buggy',
      image: ['https://d.pe/a.jpg'],
      organizationId: 'https://d.pe/#organization',
      price: 79,
      currency: 'USD',
      inLanguage: ['es', 'en'],
    });

    expect(trip).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: 'Dune buggy',
      provider: { '@id': 'https://d.pe/#organization' },
      offers: {
        '@type': 'Offer',
        price: 79,
        priceCurrency: 'USD',
        url: 'https://d.pe/tours/dune-buggy',
        availability: 'https://schema.org/InStock',
      },
    });
  });

  it('numbers breadcrumb items from one', () => {
    const list = breadcrumbLd([
      { name: 'Home', url: 'https://d.pe/' },
      { name: 'Tours', url: 'https://d.pe/tours' },
    ]);
    expect(list['itemListElement']).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://d.pe/' },
      { '@type': 'ListItem', position: 2, name: 'Tours', item: 'https://d.pe/tours' },
    ]);
  });

  it('omits empty organization fields and builds FAQ entries', () => {
    const organization = organizationLd({
      name: 'Desértica',
      url: 'https://d.pe',
      logo: 'https://d.pe/logo.svg',
      sameAs: [],
    });
    expect(organization).not.toHaveProperty('email');
    expect(organization).not.toHaveProperty('sameAs');
    expect(organization['@id']).toBe('https://d.pe/#organization');

    expect(faqLd([{ question: 'Q?', answer: 'A.' }])).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Q?', acceptedAnswer: { text: 'A.' } }],
    });
  });

  it('never lets a value close the script tag', () => {
    expect(serializeLd({ name: '</script><script>alert(1)</script>' })).not.toContain('<');
  });
});
