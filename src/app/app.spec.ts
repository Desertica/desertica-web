import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { App } from './app';
import { I18nService } from './core/i18n/i18n';
import { remoteImageLoader } from './core/images/remote-image-loader';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('theme');
    localStorage.removeItem('locale');
    document.cookie = 'locale=; path=/; max-age=0';
    document.documentElement.lang = 'en';
    document.documentElement.classList.remove('dark');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideSpartanHlm(),
        provideNativeDateAdapter(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('theme');
    localStorage.removeItem('locale');
    document.cookie = 'locale=; path=/; max-age=0';
    document.documentElement.lang = 'en';
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the Desertica header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Desértica');
    expect(compiled.textContent).toContain('Tours');
    expect(compiled.textContent).toContain('Plan your trip');
    expect(compiled.querySelector('#smooth-wrapper')).not.toBeNull();
    expect(compiled.querySelector('#smooth-content')).not.toBeNull();
    expect(compiled.querySelector('a[href="#main-content"]')).not.toBeNull();
  });

  it('should toggle and persist the color theme', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle color theme"]',
    );

    expect(toggle).not.toBeNull();
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    toggle?.click();
    await fixture.whenStable();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('translates chrome copy when the locale changes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const i18n = TestBed.inject(I18nService);

    i18n.setLocale('es');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Planifica tu viaje');
    expect(compiled.textContent).toContain('Paquetes');
    expect(
      compiled.querySelector<HTMLButtonElement>('button[aria-label="Cambiar tema de color"]'),
    ).not.toBeNull();
  });
});
