import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { tourPage } from '../../../core/catalog/tour-pages';
import { tourById } from '../../../core/catalog/tours';
import { CurrencyService } from '../../../core/currency/currency';
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
    const tour = { ...base, priceFrom: 79, pricePen: 290 };
    const fixture = TestBed.createComponent(TourHeading);
    fixture.componentRef.setInput('tour', tour);
    fixture.componentRef.setInput('page', tourPage(tour));
    await fixture.whenStable();
    const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

    expect(text()).toContain('$USD 79');
    expect(text()).not.toContain('290');

    TestBed.inject(CurrencyService).set('PEN');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(text()).toContain('S/PEN 290');
    expect(text()).not.toContain('$USD 79');
  });
});
