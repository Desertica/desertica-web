import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { allowMotion, stubMatchMedia } from '../../testing/match-media';
import { settleMotion } from '../../testing/settle-motion';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  beforeEach(async () => {
    stubMatchMedia(allowMotion);
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    localStorage.removeItem('theme');
    localStorage.removeItem('locale');
    document.documentElement.classList.remove('dark');
    await TestBed.configureTestingModule({
      imports: [SiteHeader],
      providers: [provideRouter([{ path: '**', children: [] }]), provideSpartanHlm()],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('theme');
    localStorage.removeItem('locale');
    document.documentElement.classList.remove('dark');
    document.documentElement.lang = 'en';
    vi.unstubAllGlobals();
  });

  it('opens the desktop tours menu and the mobile sheet', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    await fixture.whenStable();
    await settleMotion();
    const compiled = fixture.nativeElement as HTMLElement;

    const tours = Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Tours',
    );
    tours?.dispatchEvent(new MouseEvent('pointerenter', { bubbles: true }));
    tours?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    tours?.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await fixture.whenStable();

    const menu = compiled.querySelector('button[aria-label="Open menu"]') as HTMLButtonElement;
    menu.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Products');
    const product = Array.from(document.querySelectorAll('a')).find(
      (link) => link.textContent?.trim() === 'Products' && link.getAttribute('href') === '/products',
    );
    product?.click();
    await fixture.whenStable();

    const theme = compiled.querySelector(
      'button[aria-label="Toggle color theme"]',
    ) as HTMLButtonElement;
    theme.click();
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fixture.destroy();
  });

  it('uses a Tours dropdown in mobile and stacks items right-to-left top-to-bottom', async () => {
    const fixture = TestBed.createComponent(SiteHeader);
    await fixture.whenStable();
    await settleMotion();
    const compiled = fixture.nativeElement as HTMLElement;

    const menu = compiled.querySelector('button[aria-label="Open menu"]') as HTMLButtonElement;
    menu.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await fixture.whenStable();

    const sheetNav = document.querySelector('.mobile-nav-sheet nav') as HTMLElement;
    expect(sheetNav).toBeTruthy();

    const topLevelLabels = Array.from(
      sheetNav.querySelectorAll(':scope > a, :scope > div > button'),
    )
      .map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean);
    expect(topLevelLabels).toEqual([
      'Plan your trip',
      'Contact',
      'About',
      'Products',
      'Tours',
    ]);

    const toursTrigger = sheetNav.querySelector('#mobile-tours-trigger') as HTMLButtonElement;
    expect(toursTrigger).toBeTruthy();
    expect(toursTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('mobile-tours-panel')).toBeNull();

    toursTrigger.click();
    await fixture.whenStable();

    expect(toursTrigger.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById('mobile-tours-panel');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain('All tours');
    expect(panel?.textContent).toContain('Huacachina');
    expect(panel?.textContent).toContain('Dune buggy');

    const dune = Array.from(panel!.querySelectorAll('a')).find(
      (link) => link.textContent?.trim() === 'Dune buggy',
    );
    expect(dune?.getAttribute('href')).toBe('/tours/dune-buggy');
    dune?.click();
    await fixture.whenStable();

    expect(document.getElementById('mobile-tours-panel')).toBeNull();

    fixture.destroy();
  });
});
