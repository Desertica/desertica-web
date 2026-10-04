import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { INTRO_STORAGE_KEY, IntroService, isHomePath } from './intro';

describe('isHomePath', () => {
  it('treats root and trailing slashes as home', () => {
    expect(isHomePath('/')).toBe(true);
    expect(isHomePath('')).toBe(true);
    expect(isHomePath('///')).toBe(true);
  });

  it('treats any other path as a deep link', () => {
    expect(isHomePath('/contact')).toBe(false);
    expect(isHomePath('/about')).toBe(false);
    expect(isHomePath('/tours/dune-buggy')).toBe(false);
  });
});

describe('IntroService', () => {
  let mediaMatches = false;

  beforeEach(() => {
    mediaMatches = false;
    sessionStorage.removeItem(INTRO_STORAGE_KEY);
    document.documentElement.dataset['intro'] = 'pending';
    window.history.replaceState({}, '', '/');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: query.includes('prefers-reduced-motion') ? mediaMatches : false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }),
    });

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    sessionStorage.removeItem(INTRO_STORAGE_KEY);
    document.documentElement.dataset['intro'] = 'done';
    window.history.replaceState({}, '', '/');
  });

  it('plays when the session has not seen the intro', () => {
    const service = TestBed.inject(IntroService);

    expect(service.shouldPlay()).toBe(true);
    expect(service.status()).toBe('pending');
  });

  it('skips when the intro was already stored', () => {
    sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
    const service = TestBed.inject(IntroService);

    expect(service.shouldPlay()).toBe(false);
    expect(service.status()).toBe('done');
  });

  it('skips when the user prefers reduced motion', () => {
    mediaMatches = true;
    const service = TestBed.inject(IntroService);

    expect(service.shouldPlay()).toBe(false);
    expect(service.status()).toBe('done');
  });

  it('marks playing and complete on the document and session', () => {
    const service = TestBed.inject(IntroService);

    service.markPlaying();
    expect(service.status()).toBe('playing');
    expect(document.documentElement.dataset['intro']).toBe('playing');

    service.complete();
    expect(service.status()).toBe('done');
    expect(document.documentElement.dataset['intro']).toBe('done');
    expect(sessionStorage.getItem(INTRO_STORAGE_KEY)).toBe('1');
    expect(service.shouldPlay()).toBe(false);

    service.complete();
    expect(sessionStorage.getItem(INTRO_STORAGE_KEY)).toBe('1');
  });

  it('ignores a storage failure and a second play request after completion', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const blocked = TestBed.inject(IntroService);
    expect(blocked.shouldPlay()).toBe(false);
    vi.mocked(Storage.prototype.getItem).mockRestore();

    const service = TestBed.inject(IntroService);
    service.complete();
    service.markPlaying();
    expect(service.status()).toBe('done');

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const writing = TestBed.inject(IntroService);
    expect(() => writing.complete()).not.toThrow();
    vi.mocked(Storage.prototype.setItem).mockRestore();
  });

  it('stays done away from the browser', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(IntroService);

    expect(service.shouldPlay()).toBe(false);
    expect(service.status()).toBe('done');
    expect(service.showOverlay()).toBe(false);
    service.markPlaying();
    service.complete();
  });
});
