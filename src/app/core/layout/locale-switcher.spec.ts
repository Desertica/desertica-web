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

  async function render() {
    const fixture = TestBed.createComponent(LocaleSwitcher);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const [es, en] = Array.from(el.querySelectorAll('button'));
    return { fixture, el, es, en };
  }

  it('shows ES | EN as a labelled group with the active one pressed', async () => {
    const { el, es, en } = await render();

    const group = el.querySelector('[role="group"]');
    expect(group?.getAttribute('aria-label')).toBe('Language');
    expect(es.textContent?.trim()).toBe('ES');
    expect(en.textContent?.trim()).toBe('EN');
    expect(es.getAttribute('aria-label')).toBe('Español');
    expect(en.getAttribute('aria-pressed')).toBe('true');
    expect(es.getAttribute('aria-pressed')).toBe('false');
  });

  it('stays plain text: no filled or outlined pill', async () => {
    const { el, es, en } = await render();

    expect(el.querySelector('[role="group"]')?.textContent?.replace(/\s/g, '')).toBe('ES/EN');
    for (const b of [es, en]) {
      expect(b.className).not.toContain('bg-primary');
      expect(b.dataset['variant']).not.toBe('outline');
    }
    expect(el.textContent).not.toContain('Language');
  });

  it('shows a visible label in the mobile menu size', async () => {
    const fixture = TestBed.createComponent(LocaleSwitcher);
    fixture.componentRef.setInput('size', 'lg');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('span[aria-hidden="true"]')?.textContent?.trim()).toBe('Language');
    expect(el.querySelector('button')?.dataset['size']).toBe('lg');
  });

  it('switches language through a full page load', async () => {
    const { fixture, es } = await render();
    const i18n = TestBed.inject(I18nService);
    const switchLanguage = vi.spyOn(i18n, 'switchLanguage').mockImplementation(() => undefined);

    es.click();
    await fixture.whenStable();

    expect(switchLanguage).toHaveBeenCalledExactlyOnceWith('es');
  });

  it('does nothing when the active language is pressed', async () => {
    const { fixture, en } = await render();
    const switchLanguage = vi.spyOn(TestBed.inject(I18nService), 'switchLanguage');

    en.click();
    await fixture.whenStable();

    expect(switchLanguage).not.toHaveBeenCalled();
    expect(en.getAttribute('aria-pressed')).toBe('true');
  });
});
