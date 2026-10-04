import { publicConfigFromEnv } from './public-config';

describe('publicConfigFromEnv', () => {
  it('defaults to no tracking, no booking engine and no Turnstile', () => {
    expect(publicConfigFromEnv({})).toEqual({
      gtmId: null,
      bookingEngineEnabled: false,
      turnstileSiteKey: null,
      culqiPublicKey: null,
      siteUrl: null,
    });
  });

  it('reads the environment and trims the site URL', () => {
    expect(
      publicConfigFromEnv({
        GTM_ID: ' GTM-AB12CD ',
        BOOKING_ENGINE_ENABLED: 'TRUE',
        TURNSTILE_SITE_KEY: '0xKEY',
        CULQI_PUBLIC_KEY: ' pk_test_abc123 ',
        SITE_URL: 'https://desertica.pe/',
      }),
    ).toEqual({
      gtmId: 'GTM-AB12CD',
      bookingEngineEnabled: true,
      turnstileSiteKey: '0xKEY',
      culqiPublicKey: 'pk_test_abc123',
      siteUrl: 'https://desertica.pe',
    });
  });

  it('ignores a malformed GTM id and any other flag value', () => {
    const config = publicConfigFromEnv({ GTM_ID: 'UA-1; alert(1)', BOOKING_ENGINE_ENABLED: 'yes' });
    expect(config.gtmId).toBeNull();
    expect(config.bookingEngineEnabled).toBe(false);
  });

  it('never exposes a Culqi secret key or a malformed key', () => {
    expect(publicConfigFromEnv({ CULQI_PUBLIC_KEY: 'sk_live_abc123' }).culqiPublicKey).toBeNull();
    expect(publicConfigFromEnv({ CULQI_PUBLIC_KEY: 'pk_live_abc"; x' }).culqiPublicKey).toBeNull();
    expect(publicConfigFromEnv({ CULQI_PUBLIC_KEY: 'pk_live_AbC123' }).culqiPublicKey).toBe('pk_live_AbC123');
  });
});
