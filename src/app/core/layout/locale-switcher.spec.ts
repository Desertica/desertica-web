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

  it('switches the locale from the menu', async () => {
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

    expect(TestBed.inject(I18nService).locale()).toBe('es');
    expect(button.textContent).toContain('ES');
  });
});
