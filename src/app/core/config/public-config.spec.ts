import { publicConfigFromEnv } from './public-config';

describe('publicConfigFromEnv', () => {
  it('defaults to no tracking, no booking engine and no Turnstile', () => {
    expect(publicConfigFromEnv({})).toEqual({
      gtmId: null,
      bookingEngineEnabled: false,
      turnstileSiteKey: null,
      siteUrl: null,
    });
  });

  it('reads the environment and trims the site URL', () => {
    expect(
      publicConfigFromEnv({
        GTM_ID: ' GTM-AB12CD ',
        BOOKING_ENGINE_ENABLED: 'TRUE',
        TURNSTILE_SITE_KEY: '0xKEY',
        SITE_URL: 'https://desertica.pe/',
      }),
    ).toEqual({
      gtmId: 'GTM-AB12CD',
      bookingEngineEnabled: true,
      turnstileSiteKey: '0xKEY',
      siteUrl: 'https://desertica.pe',
    });
  });

  it('ignores a malformed GTM id and any other flag value', () => {
    const config = publicConfigFromEnv({ GTM_ID: 'UA-1; alert(1)', BOOKING_ENGINE_ENABLED: 'yes' });
    expect(config.gtmId).toBeNull();
    expect(config.bookingEngineEnabled).toBe(false);
  });
});
