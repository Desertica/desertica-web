import { TestBed } from '@angular/core/testing';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { tourPage } from '../../../core/catalog/tour-pages';
import { tourById } from '../../../core/catalog/tours';
import { TourTimeline } from './tour-timeline';

describe('TourTimeline', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourTimeline],
      providers: [provideSpartanHlm()],
    }).compileComponents();
  });

  it('renders Luma station cards on a static rail', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const fixture = TestBed.createComponent(TourTimeline);
    fixture.componentRef.setInput('stops', tourPage(tour).itinerary);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const cards = compiled.querySelectorAll('[data-slot=card]');
    expect(cards.length).toBe(5);
    for (const card of Array.from(cards)) {
      expect(card.className).toContain('rounded-4xl');
      expect(card.className).not.toContain('rounded-none');
    }
    expect(compiled.textContent).toContain('15:50');
    expect(compiled.textContent).toContain('Meeting point');
    expect(compiled.querySelector('.snap-x')).toBeNull();
    expect(compiled.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });
});
