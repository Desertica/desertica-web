import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { TourBook } from '../tours/detail/tour-book';
import { Reservations } from './reservations';

describe('Reservations', () => {
  beforeEach(async () => {
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
      providers: [
        provideRouter(
          [{ path: 'reservations', component: Reservations }],
          withComponentInputBinding(),
        ),
        provideSpartanHlm(),
        provideNativeDateAdapter(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  it('hides the booking form until a tour is in the query', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reservations', Reservations);

    expect(harness.routeNativeElement?.querySelector('app-tour-book')).toBeNull();
    expect(pressedButton(harness, 'Huacachina')).toBeNull();
  });

  it('opens a shared link with the axis and tour already pressed', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reservations?eje=huacachina&tour=dune-buggy', Reservations);

    expect(harness.routeNativeElement?.querySelector('app-tour-book')).not.toBeNull();
    expect(pressedButton(harness, 'Huacachina')?.getAttribute('aria-pressed')).toBe('true');
    expect(pressedButton(harness, 'Dune buggy')?.getAttribute('aria-pressed')).toBe('true');
    expect(card(harness)?.className).not.toContain('rounded-none');
  });

  it('drops the tour from the URL when the axis changes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reservations?eje=huacachina&tour=dune-buggy', Reservations);

    clickButton(harness, 'Paracas');
    await harness.fixture.whenStable();
    harness.detectChanges();

    const url = TestBed.inject(Router).url;
    expect(url).toContain('eje=paracas');
    expect(url).not.toContain('tour=');
    expect(harness.routeNativeElement?.querySelector('app-tour-book')).toBeNull();
  });

  it('remounts the form when another tour on the same axis is chosen', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reservations?eje=huacachina&tour=dune-buggy', Reservations);

    const first = book(harness);
    const kept = new Date();
    kept.setDate(kept.getDate() + 30);
    first.form.controls.date.setValue(kept);

    clickButton(harness, 'Sandboarding');
    await harness.fixture.whenStable();
    harness.detectChanges();

    const second = book(harness);
    expect(second).not.toBe(first);
    expect(second.form.controls.date.value).toBeNull();

    const next = new Date();
    next.setDate(next.getDate() + 12);
    second.form.controls.date.setValue(next);
    second.send();

    expect(open).toHaveBeenCalled();
    const href = String(open.mock.calls[0]?.[0] ?? '');
    const text = decodeURIComponent(href.split('text=')[1] ?? '');
    expect(text).toContain('Sandboarding');
    expect(text).not.toContain('Dune buggy');
    open.mockRestore();
  });

  it('ignores an axis or tour that does not belong together', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reservations?eje=lima&tour=dune-buggy', Reservations);

    expect(harness.routeNativeElement?.querySelector('app-tour-book')).toBeNull();
    expect(pressedButton(harness, 'Huacachina')).toBeNull();

    await harness.navigateByUrl('/reservations?eje=huacachina&tour=ballestas', Reservations);

    expect(harness.routeNativeElement?.querySelector('app-tour-book')).toBeNull();
    expect(pressedButton(harness, 'Ballestas')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Dune buggy');
  });
});

function pressedButton(harness: RouterTestingHarness, name: string): HTMLButtonElement | null {
  return (
    [...(harness.routeNativeElement?.querySelectorAll('button') ?? [])].find(
      (button) =>
        button.getAttribute('aria-pressed') === 'true' && button.textContent?.includes(name),
    ) ?? null
  );
}

function clickButton(harness: RouterTestingHarness, name: string): void {
  const button = [...(harness.routeNativeElement?.querySelectorAll('button') ?? [])].find((item) =>
    item.textContent?.includes(name),
  );
  if (!button) {
    throw new Error(`Missing button ${name}`);
  }

  button.click();
}

function book(harness: RouterTestingHarness): TourBook {
  const match = harness.fixture.debugElement.query(By.directive(TourBook));
  return match.componentInstance as TourBook;
}

function card(harness: RouterTestingHarness): HTMLElement | null {
  return harness.routeNativeElement?.querySelector('[data-slot=card]') ?? null;
}
