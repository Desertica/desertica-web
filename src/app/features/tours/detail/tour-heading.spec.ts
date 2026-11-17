import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { tourById } from '../../../core/catalog/tours';
import { CurrencyService } from '../../../core/currency/currency';
import { loadPublicApi, publicTour } from '../../../testing/public-api';
import { TourHeading } from './tour-heading';

describe('TourHeading price', () => {
  beforeEach(async () => {
    localStorage.removeItem('currency');
    await TestBed.configureTestingModule({
      imports: [TourHeading],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem('currency'));

  it('shows the price in the chosen currency, not both', async () => {
    const base = tourById('dune-buggy');
    expect(base).toBeDefined();
    if (!base) {
      return;
    }
    loadPublicApi(TestBed, {
      tours: [publicTour({ durationHours: 2, format: 'BOTH', languages: ['es', 'en'] })],
      prices: { USD: { 'dune-buggy': 7900 }, PEN: { 'dune-buggy': 29000 } },
    });
    const fixture = TestBed.createComponent(TourHeading);
    fixture.componentRef.setInput('tour', base);
    await fixture.whenStable();
    const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

    expect(text()).toContain('$USD 79');
    expect(text()).not.toContain('290');
    expect(text()).toContain('2 HOURS');
    expect(text()).toContain('ES / EN');
    expect(text()).toContain('Group or private');

    TestBed.inject(CurrencyService).set('PEN');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(text()).toContain('S/PEN 290');
    expect(text()).not.toContain('$USD 79');
  });

  it('hides duration, languages, format and price when the API has none', async () => {
    const base = tourById('dune-buggy');
    expect(base).toBeDefined();
    if (!base) {
      return;
    }
    const fixture = TestBed.createComponent(TourHeading);
    fixture.componentRef.setInput('tour', base);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    // Only the destination badge is left.
    expect(root.querySelectorAll('[hlmBadge]')).toHaveLength(1);
    expect(root.textContent).not.toContain('USD');
    expect(root.querySelector('h1')?.textContent).toContain('Dune buggy');
  });
});
