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
  });
});
