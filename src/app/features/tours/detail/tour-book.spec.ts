import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { tourPage } from '../../../core/catalog/tour-pages';
import { tourById } from '../../../core/catalog/tours';
import { TourBook, tourDuePrice } from './tour-book';
import { formatTourDate } from './tour-whatsapp';

describe('TourBook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourBook],
      providers: [provideRouter([]), provideSpartanHlm(), provideNativeDateAdapter()],
    }).compileComponents();
  });

  it('shows price, date picker, people stepper, language, and payment options', async () => {
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
    expect(compiled.querySelector('#tour-due')?.textContent).toContain('FROM');
    expect(compiled.querySelector('#tour-due')?.textContent).toContain('$USD');
    expect(compiled.querySelector('#tour-due')?.textContent).toContain(String(tour.priceFrom));
    expect(compiled.querySelector('hlm-date-picker')).not.toBeNull();
    expect(compiled.querySelector('#tour-date')).not.toBeNull();
    expect(compiled.querySelector('[data-slot=card]')?.className).toContain('rounded-4xl');
    expect(compiled.querySelector('[data-slot=card]')?.className).not.toContain('rounded-none');
    expect(compiled.querySelector('#tour-date')?.className).toContain('bg-input/50');
    expect(compiled.querySelector('#tour-date')?.className).toContain('rounded-3xl');
    expect(compiled.querySelector('#tour-people')?.className).toContain('bg-input/50');
    expect(compiled.querySelector('#tour-people')?.className).toContain('rounded-3xl');
    expect(compiled.querySelector('#tour-people')?.className).not.toContain('rounded-none');
    expect(compiled.querySelector('#tour-people')?.textContent).toContain('1 adult');
    expect(compiled.querySelector('#tour-pay-full-amount')?.textContent).toContain(
      String(tour.priceFrom),
    );
    expect(compiled.querySelector('#tour-pay-deposit-amount')?.textContent).toContain(
      String(tourDuePrice(tour.priceFrom, 'deposit', 1)),
    );
    expect(compiled.querySelector('#tour-language-label')?.textContent?.trim()).toBe('Language');
    expect(compiled.querySelector('.grid.grid-cols-2')).not.toBeNull();
    expect(compiled.querySelector('#tour-format-label')).not.toBeNull();
    expect(compiled.querySelector('#tour-name')).toBeNull();
    expect(compiled.querySelector('#tour-pay-full')).not.toBeNull();
    expect(compiled.querySelector('#tour-pay-deposit')).not.toBeNull();
    expect(compiled.textContent).toContain('Pay full price');
    expect(compiled.textContent).toContain('Book now, pay later');
    expect(compiled.querySelector('button[type=submit]')?.textContent?.trim()).toBe('Book');
    expect(compiled.textContent).not.toContain('WhatsApp');
  });

  it('updates the header price when paying later', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const fixture = TestBed.createComponent(TourBook);
    fixture.componentRef.setInput('tour', tour);
    fixture.componentRef.setInput('page', tourPage(tour));
    await fixture.whenStable();

    const deposit = fixture.nativeElement.querySelector(
      'label[for="tour-pay-deposit"]',
    ) as HTMLLabelElement;
    expect(deposit).not.toBeNull();
    deposit.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const due = fixture.nativeElement.querySelector('#tour-due') as HTMLElement;
    expect(due.textContent).toContain(String(tourDuePrice(tour.priceFrom, 'deposit', 1)));
    expect(due.textContent).not.toContain(String(tour.priceFrom));
  });

  it('scales radio amounts when the party grows', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const fixture = TestBed.createComponent(TourBook);
    fixture.componentRef.setInput('tour', tour);
    fixture.componentRef.setInput('page', tourPage(tour));
    await fixture.whenStable();

    fixture.componentInstance.form.controls.adults.setValue(2);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#tour-pay-full-amount')?.textContent).toContain(
      String(tourDuePrice(tour.priceFrom, 'full', 2)),
    );
    expect(compiled.querySelector('#tour-pay-deposit-amount')?.textContent).toContain(
      String(tourDuePrice(tour.priceFrom, 'deposit', 2)),
    );
    expect(compiled.querySelector('#tour-due')?.textContent).toContain(
      String(tourDuePrice(tour.priceFrom, 'full', 2)),
    );
  });

  it('opens WhatsApp with adults, children, and payment', async () => {
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

    const date = new Date();
    date.setDate(date.getDate() + 30);
    const component = fixture.componentInstance;
    component.form.setValue({
      date,
      language: 'en',
      adults: 3,
      children: 1,
      format: 'shared',
      payment: 'deposit',
    });
    component.send();

    expect(open).toHaveBeenCalled();
    const href = String(open.mock.calls[0]?.[0] ?? '');
    expect(href.startsWith('https://wa.me/519XXXXXXXX?text=')).toBe(true);
    const text = decodeURIComponent(href.split('text=')[1] ?? '');
    expect(text).toContain('Dune buggy');
    expect(text).toContain(formatTourDate(date));
    expect(text).toContain('English');
    expect(text).toContain('Adults: 3');
    expect(text).toContain('Children: 1');
    expect(text).not.toContain('People: 4');
    expect(text).toContain('Group');
    expect(text).not.toContain('Ana');
    expect(text).toContain('Book now, pay later');
    expect(text).toContain(`$USD ${tourDuePrice(tour.priceFrom, 'deposit', 4)}`);
  });

  it('shows field errors, steps the party, and ignores unknown choices', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const fixture = TestBed.createComponent(TourBook);
    const page = tourPage(tour);
    fixture.componentRef.setInput('tour', tour);
    fixture.componentRef.setInput('page', { ...page, format: 'private' });
    await fixture.whenStable();

    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    submit.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Choose a date');
    expect(open).not.toHaveBeenCalled();

    const past = new Date();
    past.setDate(past.getDate() - 2);
    fixture.componentInstance.form.controls.date.setValue(past);
    fixture.componentInstance.form.controls.date.markAsTouched();
    fixture.detectChanges();
    submit.click();
    expect(open).not.toHaveBeenCalled();

    fixture.componentInstance.form.controls.adults.setValue(2);
    fixture.componentInstance.form.controls.children.setValue(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2 adults');
    expect(fixture.nativeElement.textContent).toContain('1 child');

    fixture.componentInstance.form.controls.children.setValue(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2 children');

    fixture.componentInstance.form.controls.adults.setValue(0);
    fixture.componentInstance.form.controls.adults.markAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Enter 1 to 12 people.');

    const people = fixture.nativeElement.querySelector('#tour-people') as HTMLButtonElement;
    people.click();
    await fixture.whenStable();
    const buttons = Array.from(document.querySelectorAll('button'));
    const plus = buttons.filter((button) => button.textContent?.trim() === '+');
    const minus = buttons.filter((button) => button.textContent?.trim() === '−');
    fixture.componentInstance.form.controls.adults.setValue(1);
    fixture.componentInstance.form.controls.children.setValue(0);
    fixture.detectChanges();
    minus[0]?.click();
    minus[1]?.click();
    plus[0]?.click();
    plus[1]?.click();
    await fixture.whenStable();

    fixture.componentInstance.form.controls.adults.setValue(12);
    fixture.detectChanges();
    plus[0]?.click();

    const language = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Español'),
    ) as HTMLButtonElement;
    language.click();
    await fixture.whenStable();

    fixture.componentRef.setInput('page', page);
    fixture.detectChanges();
    await fixture.whenStable();
    const shared = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Group'),
    ) as HTMLButtonElement | undefined;
    shared?.click();
    await fixture.whenStable();

    const dateButton = fixture.nativeElement.querySelector('#tour-date') as HTMLButtonElement;
    dateButton.click();
    await fixture.whenStable();
    const day = document.querySelector('[brncalendcellbutton]:not([disabled]), button[brncalendcellbutton]') as
      | HTMLButtonElement
      | null;
    day?.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#tour-format-label')).not.toBeNull();
  });
});

describe('tourDuePrice', () => {
  it('takes 20 percent of the party total', () => {
    expect(tourDuePrice(135, 'full')).toBe(135);
    expect(tourDuePrice(135, 'deposit')).toBe(27);
    expect(tourDuePrice(79, 'full', 2)).toBe(158);
    expect(tourDuePrice(79, 'deposit', 2)).toBe(32);
  });
});
