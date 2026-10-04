import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { tourPage } from '../../../core/catalog/tour-pages';
import { tourById } from '../../../core/catalog/tours';
import { remoteImageLoader } from '../../../core/images/remote-image-loader';
import { TourTimeline } from './tour-timeline';

describe('TourTimeline', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourTimeline],
      providers: [{ provide: IMAGE_LOADER, useValue: remoteImageLoader }],
    }).compileComponents();
  });

  it('renders numbered photo rows without hours or cards', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const fixture = TestBed.createComponent(TourTimeline);
    fixture.componentRef.setInput('stops', tourPage(tour).itinerary);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const items = compiled.querySelectorAll('ol > li');
    expect(items.length).toBe(5);
    expect(compiled.querySelectorAll('img').length).toBe(5);
    for (const [index, item] of Array.from(items).entries()) {
      const text = item.textContent ?? '';
      expect(text).toContain(String(index + 1).padStart(2, '0'));
      expect(item.querySelector('img')?.className).toContain('rounded-none');
    }
    expect(compiled.textContent).toContain('The day');
    expect(compiled.textContent).toContain('Meeting point');
    expect(compiled.textContent).toContain('Ica. The exact point comes with confirmation.');
    expect(compiled.querySelector('time')).toBeNull();
    expect(compiled.textContent).not.toContain('15:50');
    expect(compiled.querySelector('.snap-x')).toBeNull();
    expect(compiled.querySelector('svg')).toBeNull();
    expect(compiled.querySelector('[data-slot=card]')).toBeNull();
  });
});
