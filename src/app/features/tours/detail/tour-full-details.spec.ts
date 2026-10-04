import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { tourPage } from '../../../core/catalog/tour-pages';
import { tourById } from '../../../core/catalog/tours';
import { remoteImageLoader } from '../../../core/images/remote-image-loader';
import { TourFullDetails } from './tour-full-details';

describe('TourFullDetails', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourFullDetails],
      providers: [provideRouter([]), provideSpartanHlm()],
    }).compileComponents();
  });

  it('renders five closed accordion sections with a terms link', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const fixture = TestBed.createComponent(TourFullDetails);
    fixture.componentRef.setInput('page', tourPage(tour));
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const triggers = compiled.querySelectorAll('hlm-accordion-trigger');
    expect(triggers.length).toBe(5);
    expect(compiled.textContent).toContain('Details');
    expect(compiled.textContent).toContain('Description and itinerary');
    expect(compiled.textContent).toContain('Important');
    expect(compiled.textContent).toContain('Included');
    expect(compiled.textContent).toContain('What to wear');
    expect(compiled.textContent).toContain('Reservation terms');
    expect(compiled.querySelector('hlm-accordion')?.getAttribute('type')).toBe('single');
    expect(compiled.querySelectorAll('[aria-expanded="true"]').length).toBe(0);
    expect(compiled.querySelector('a[href="/terms"]')).not.toBeNull();
    expect(compiled.querySelector('hlm-accordion')?.className).not.toContain('rounded-none');
  });
});
