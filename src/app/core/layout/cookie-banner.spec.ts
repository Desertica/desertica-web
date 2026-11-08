import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IntroService } from '../animation/intro';
import { ConsentService } from '../analytics/consent';
import type { DataLayerWindow } from '../analytics/data-layer';
import { CookieBanner } from './cookie-banner';

describe('CookieBanner', () => {
  const introStatus = signal<'pending' | 'playing' | 'done'>('done');

  beforeEach(async () => {
    introStatus.set('done');
    delete (window as DataLayerWindow).dataLayer;
    await TestBed.configureTestingModule({
      imports: [CookieBanner],
      providers: [provideRouter([]), { provide: IntroService, useValue: { status: introStatus } }],
    }).compileComponents();
    TestBed.inject(ConsentService).init();
  });

  it('stays hidden until the intro animation is done', () => {
    introStatus.set('playing');
    const fixture = TestBed.createComponent(CookieBanner);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();

    introStatus.set('done');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).not.toBeNull();
  });

  const text = (root: HTMLElement) => root.textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (root: HTMLElement, label: string) =>
    Array.from(root.querySelectorAll('button')).find((item) => text(item).includes(label));

  it('shows the banner until the visitor chooses, with nothing granted meanwhile', async () => {
    const fixture = TestBed.createComponent(CookieBanner);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('section')).not.toBeNull();
    expect(text(root)).toContain('Your cookie choices');
    expect(TestBed.inject(ConsentService).analytics()).toBe(false);
    expect(TestBed.inject(ConsentService).marketing()).toBe(false);
  });

  it('rejects all optional categories in one click', async () => {
    const fixture = TestBed.createComponent(CookieBanner);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    button(root, 'Reject all')?.click();
    await fixture.whenStable();

    const consent = TestBed.inject(ConsentService);
    expect(consent.choice()).toEqual({ analytics: false, marketing: false });
    expect(root.querySelector('section')).toBeNull();
  });

  it('lists the three categories under Customize and saves the switches', async () => {
    const fixture = TestBed.createComponent(CookieBanner);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    button(root, 'Customize')?.click();
    await fixture.whenStable();
    expect(text(root)).toContain('Necessary');
    expect(text(root)).toContain('Analytics');
    expect(text(root)).toContain('Marketing');
    expect(root.querySelectorAll('[role="switch"]')).toHaveLength(3);

    (root.querySelector('[aria-labelledby="cookie-analytics"]') as HTMLElement).click();
    await fixture.whenStable();
    button(root, 'Save preferences')?.click();
    await fixture.whenStable();

    expect(TestBed.inject(ConsentService).choice()).toEqual({ analytics: true, marketing: false });
  });

  it('reopens with the stored choice from the footer link', async () => {
    const fixture = TestBed.createComponent(CookieBanner);
    await fixture.whenStable();
    const consent = TestBed.inject(ConsentService);
    consent.acceptAll();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();

    consent.openPreferences();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('section')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll('[role="switch"][aria-checked="true"]').length,
    ).toBe(3);
  });
});
