import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { tourPage } from '../../../core/catalog/tour-pages';
import { tourById } from '../../../core/catalog/tours';
import { TourBook } from './tour-book';

describe('TourBook', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourBook],
      providers: [provideRouter([]), provideSpartanHlm()],
    }).compileComponents();
  });

  it('shows price, date picker, people stepper, and language with format', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const fixture = TestBed.createComponent(TourBook);
    fixture.componentRef.setInput('tour', tour);
    fixture.componentRef.setInput('page', tourPage(tour));
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[hlmCardTitle]')).toBeNull();
    expect(compiled.textContent).toContain('FROM');
    expect(compiled.textContent).toContain('$USD');
    expect(compiled.textContent).toContain(String(tour.priceFrom));
    expect(compiled.querySelector('hlm-date-picker')).not.toBeNull();
    expect(compiled.querySelector('#tour-date')).not.toBeNull();
    expect(compiled.querySelector('[data-slot=card]')?.className).toContain('rounded-4xl');
    expect(compiled.querySelector('[data-slot=card]')?.className).not.toContain('rounded-none');
    expect(compiled.querySelector('#tour-date')?.className).toContain('bg-input/50');
    expect(compiled.querySelector('#tour-date')?.className).toContain('rounded-3xl');
    expect(compiled.querySelector('#tour-people')?.className).toContain('bg-input/50');
    expect(compiled.querySelector('#tour-people')?.className).toContain('rounded-3xl');
    expect(compiled.querySelector('#tour-people')?.className).not.toContain('rounded-none');
    expect(compiled.querySelector('#tour-language-label')?.textContent?.trim()).toBe('Language');
    expect(compiled.querySelector('.grid.grid-cols-2')).not.toBeNull();
    expect(compiled.querySelector('#tour-format-label')).not.toBeNull();
  });

  it('opens WhatsApp with adults and children', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    const fixture = TestBed.createComponent(TourBook);
    fixture.componentRef.setInput('tour', tour);
    fixture.componentRef.setInput('page', tourPage(tour));
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.form.setValue({
      date: new Date(2026, 8, 20),
      language: 'en',
      adults: 3,
      children: 1,
      format: 'shared',
      name: 'Ana',
    });
    component.send();

    expect(open).toHaveBeenCalled();
    const href = String(open.mock.calls[0]?.[0] ?? '');
    expect(href.startsWith('https://wa.me/519XXXXXXXX?text=')).toBe(true);
    const text = decodeURIComponent(href.split('text=')[1] ?? '');
    expect(text).toContain('Dune buggy');
    expect(text).toContain('20/09/2026');
    expect(text).toContain('English');
    expect(text).toContain('Adults: 3');
    expect(text).toContain('Children: 1');
    expect(text).not.toContain('People: 4');
    expect(text).toContain('Group');
    expect(text).toContain('Ana');
  });
});
