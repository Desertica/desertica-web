import { TestBed } from '@angular/core/testing';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { I18nService } from '../i18n/i18n';
import { LocaleSwitcher } from './locale-switcher';

describe('LocaleSwitcher', () => {
  beforeEach(async () => {
    localStorage.removeItem('locale');
    document.cookie = 'locale=; path=/; max-age=0';
    await TestBed.configureTestingModule({
      imports: [LocaleSwitcher],
      providers: [provideSpartanHlm()],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('locale');
    document.cookie = 'locale=; path=/; max-age=0';
    document.documentElement.lang = 'en';
  });

  it('remembers the language and loads the page under its prefix (the router base changes with it)', async () => {
    // jsdom cannot navigate; it reports the attempt on the console.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(LocaleSwitcher);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.textContent).toContain('EN');
    button.click();
    await fixture.whenStable();

    const spanish = Array.from(document.querySelectorAll('button')).find((item) =>
      item.textContent?.includes('Español'),
    );
    expect(spanish).toBeDefined();
    spanish?.click();
    await fixture.whenStable();

    expect(localStorage.getItem('locale')).toBe('es');
    expect(document.cookie).toContain('locale=es');
    expect(TestBed.inject(I18nService).locale()).toBe('en');
  });
});
