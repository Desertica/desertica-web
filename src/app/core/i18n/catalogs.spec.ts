import { resolveLocale, translate } from './catalogs';

describe('i18n catalogs', () => {
  it('prefers the cookie over the query and Accept-Language', () => {
    expect(
      resolveLocale({
        cookie: 'en',
        query: 'es',
        acceptLanguage: 'es-PE,es;q=0.9',
      }),
    ).toBe('en');
  });

  it('uses the query when no cookie is set', () => {
    expect(
      resolveLocale({
        query: 'es',
        acceptLanguage: 'en-US,en;q=0.9',
      }),
    ).toBe('es');
  });

  it('falls back to Accept-Language and then English', () => {
    expect(resolveLocale({ acceptLanguage: 'es-PE,en;q=0.8' })).toBe('es');
    expect(resolveLocale({ acceptLanguage: 'fr-FR,fr;q=0.9' })).toBe('en');
  });

  it('looks up nested keys with object notation', () => {
    expect(translate('nav.tours', 'en')).toBe('Tours');
    expect(translate('nav.products', 'es')).toBe('Productos');
    expect(translate('nav.planTrip', 'es')).toBe('Planifica tu viaje');
    expect(translate('home.whyHeadline', 'en')).toContain("Ica isn't a stop");
    expect(translate('home.whyHeadline', 'es')).toContain('Ica no es una parada');
    expect(translate('gallery.from', 'en')).toBe('FROM');
    expect(translate('gallery.from', 'es')).toBe('DESDE');
    expect(translate('gallery.hours', 'en')).toBe('HOURS');
    expect(translate('gallery.hours', 'es')).toBe('HORAS');
    expect(translate('nav.blog', 'en')).toBe('Blog');
    expect(translate('footer.conduct', 'es')).toContain('ESNNA');
    expect(translate('footer.newsletterSubmit', 'es')).toBe('Suscribirme');
    expect(translate('footer.nazcaFlight', 'es')).toBe('Sobrevuelo Nazca');
    expect(translate('pages.blogLead', 'en')).toBe('Stories from Ica and Huacachina.');
    expect(translate('home.pitchKicker', 'es')).toBe('{ Cómo viajamos }');
    expect(translate('home.pitchKicker', 'en')).toBe('{ How we travel }');
    expect(translate('home.pitchHeadline', 'es')).toContain('no se improvisa');
    expect(translate('home.pitchHeadline', 'en')).toContain("isn't improvised");
    expect(translate('home.pitchBeat1', 'es')).toContain('Traslados y horarios');
    expect(translate('home.pitchBeat1', 'en')).toContain('Transfers and timing');
    expect(translate('home.pitchBeat2', 'es')).toContain('Oasis, reserva o líneas');
    expect(translate('home.pitchBeat2', 'en')).toContain('Oasis, reserve, or lines');
    expect(translate('home.pitchBeat3', 'es')).toContain('Un hilo para reservar');
    expect(translate('home.pitchBeat3', 'en')).toContain('One thread to book');
    expect(translate('pages.toursLead', 'es')).toBe('Huacachina, Paracas y Nazca, por destino.');
    expect(translate('pages.toursLead', 'en')).toBe(
      'Huacachina, Paracas, and Nazca, by destination.',
    );
    expect(translate('pages.toursLead', 'es')).not.toContain('Nueve');
    expect(translate('pages.toursLead', 'en')).not.toContain('Nine');
    expect(translate('pages.toursCtaTitle', 'es')).toBe('¿Buscas otra experiencia?');
    expect(translate('pages.toursCtaTitle', 'en')).toBe('Looking for something else?');
    expect(translate('pages.toursCtaLead', 'es')).toContain('Tours privados');
    expect(translate('pages.toursCtaLead', 'en')).toContain('Private tours');
    expect(translate('home.featuredLead', 'es')).toContain('destacados');
    expect(translate('nav.sandboard', 'es')).toBe('Sandboard');
    expect(translate('nav.icaVineyards', 'en')).toBe('Ica vineyards');
    expect(translate('nav.oasisWalkDesc', 'es')).toContain('laguna');
    expect(translate('nav.paracasSunset', 'es')).toContain('Atardecer');
    expect(translate('nav.cahuachi', 'es')).toBe('Cahuachi');
    expect(translate('nav.mariaReiche', 'es')).toContain('María Reiche');
    expect(translate('nav.contact', 'es')).toBe('Contacto');
    expect(translate('nav.contact', 'en')).toBe('Contact');
    expect(translate('pages.contactTitle', 'es')).toBe('Contáctanos');
    expect(translate('pages.contactTitle', 'en')).toBe('Contact Us');
    expect(translate('footer.contact', 'es')).toBe('Contáctanos');
    expect(translate('footer.contact', 'en')).toBe('Contact Us');
    expect(translate('pages.contactLead', 'es')).toBe(
      'Consultas sobre tours y fechas. Para reservar, usa Planifica tu viaje.',
    );
    expect(translate('pages.contactLead', 'en')).toBe(
      'Questions about tours and dates. To book, use Plan your trip.',
    );
    expect(translate('pages.contactLead', 'es')).not.toContain('SSG');
    expect(translate('pages.contactLead', 'en')).not.toContain('SSG');
    expect(translate('contact.submit', 'es')).toBe('Enviar');
    expect(translate('contact.notRobot', 'en')).toBe("I'm not a robot");
    expect(translate('contact.whatsapp', 'es')).toBe('WhatsApp');
    expect(translate('contact.thanks', 'en')).toContain('Message sent');
    expect(translate('contact.replyTitle', 'es')).toBe('Te respondemos por WhatsApp');
    expect(translate('contact.replyHours', 'en')).toContain('Peru time');
    expect(translate('contact.searchCountry', 'es')).toBe('Buscar país');
    expect(translate('contact.whatsappError', 'en')).toContain('valid WhatsApp number');
    expect(translate('contact.messagePlaceholder', 'es')).toBe('¿Qué tienes pensado?');
    expect(translate('contact.messagePlaceholder', 'en')).toBe('What did you have in mind?');
    expect(translate('contact.messageCount', 'en')).toContain('{count} of 500');
    expect(translate('contact.nameMinError', 'es')).toContain('2 caracteres');
    expect(translate('pages.aboutLead', 'en')).toBe('pages.aboutLead');
    expect(translate('pages.aboutLead', 'es')).toBe('pages.aboutLead');
    expect(translate('about.heroTitle', 'es')).toContain('destino');
    expect(translate('about.heroTitle', 'en')).toContain('destination');
    expect(translate('about.heroTitle', 'es')).not.toContain('SSG');
    expect(translate('about.heroTitle', 'en')).not.toContain('SSG');
    expect(translate('about.heroLead', 'en')).not.toContain('Story later');
    expect(translate('about.kicker', 'es')).toBe('{ Desde Ica }');
    expect(translate('about.kicker', 'en')).toBe('{ From Ica }');
    expect(translate('about.quoteA', 'es')).toContain('comienzo');
    expect(translate('about.quoteB', 'en')).toContain('up close');
    expect(translate('about.mapHeadline', 'es')).toContain('arma el día');
    expect(translate('about.mapLead', 'es')).not.toContain('Trujillo');
    expect(translate('about.mapLead', 'en')).not.toContain('Trujillo');
    expect(translate('about.ribbon', 'es')).toBe('Ica · Huacachina · Paracas · Nazca');
    expect(translate('about.ribbon', 'en')).toContain('Ica');
    expect(translate('about.ribbon', 'en')).not.toContain('Trujillo');
    expect(translate('about.trioCaption', 'es')).toContain('Huacachina');
    expect(translate('about.motivaHeadline', 'en')).toContain('stay');
    expect(translate('about.motivaLabel1', 'es')).toBe('Motivación');
    expect(translate('about.motivaLabel2', 'en')).toBe('Commitment');
    expect(translate('about.motivaLabel3', 'es')).toBe('Impulso');
    expect(translate('about.craftLabel1', 'es')).toBe('Encuentro');
    expect(translate('about.craftLabel1', 'en')).toBe('Meeting point');
    expect(translate('about.craftMeet', 'es')).toContain('Ica');
    expect(translate('about.archiveLead', 'es')).toContain('archivo');
    expect(translate('about.closerTitle', 'es')).toContain('Armamos');
    expect(translate('about.closerLead', 'en')).toContain('axis');
    expect(translate('tour.book', 'es')).toBe('Reservar');
    expect(translate('tour.book', 'en')).toBe('Book');
    expect(translate('tour.book', 'es')).not.toContain('WhatsApp');
    expect(translate('tour.payLater', 'es')).toContain('paga después');
    expect(translate('tour.highlights', 'en')).toContain('includes');
    expect(translate('tours.duneBuggy.lead', 'es')).toContain('tubular');
    expect(translate('tours.duneBuggy.lead', 'en')).toContain('tubular');
    expect(translate('tours.duneBuggy.itinerary.meet.title', 'es')).toBe('Encuentro');
    expect(translate('tour.language', 'en')).toBe('Language');
    expect(translate('tour.language', 'es')).toBe('Idioma');
    expect(translate('tour.whatsappMessage', 'en')).toContain('{tour}');
    expect(translate('tour.whatsappMessage', 'en')).toContain('{adults}');
    expect(translate('tour.whatsappMessage', 'en')).toContain('{children}');
    expect(translate('tour.whatsappMessage', 'en')).not.toContain('{people}');
    expect(translate('tour.whatsappMessage', 'en')).toContain('{payment}');
    expect(translate('tour.whatsappMessage', 'en')).toContain('{amount}');
    expect(translate('tour.whatsappMessage', 'en')).not.toContain('{name}');
  });
});
