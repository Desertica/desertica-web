import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { tourById } from '../../../core/catalog/tours';
import { stubWhatsapp } from '../../../testing/contact';
import { loadPublicApi, publicTour } from '../../../testing/public-api';
import { TourBook, tourDuePrice } from './tour-book';
import { formatTourDate } from './tour-whatsapp';

const PRICE = 79;

describe('TourBook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const configure = () =>
    TestBed.configureTestingModule({
      imports: [TourBook],
      providers: [provideRouter([]), provideSpartanHlm(), provideNativeDateAdapter()],
    }).compileComponents();

  beforeEach(async () => {
    await configure();
    // Price, deposit, languages and format are the booking system's.
    loadPublicApi(TestBed, {
      tours: [publicTour({ format: 'BOTH', languages: ['es', 'en'] })],
      rules: { depositPercent: 20, availabilityMonths: 3, adultsMin: 1, childrenMin: 0, peopleMax: 12 },
      prices: { USD: { 'dune-buggy': PRICE * 100 } },
    });
  });

  it('shows no price, language or format, and sends no amount, when the API has none', async () => {
    TestBed.resetTestingModule();
    await configure();
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    stubWhatsapp(TestBed);
    const fixture = TestBed.createComponent(TourBook);
    fixture.componentRef.setInput('tour', tour);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#tour-due')).toBeNull();
    expect(compiled.querySelector('#tour-pay-full-amount')).toBeNull();
    expect(compiled.querySelector('#tour-pay-deposit-amount')).toBeNull();
    expect(compiled.querySelector('#tour-language-label')).toBeNull();
    expect(compiled.querySelector('#tour-format-label')).toBeNull();
    expect(compiled.querySelector('#tour-people')?.textContent).toContain('1 adult');

    const date = new Date();
    date.setDate(date.getDate() + 30);
    fixture.componentInstance.form.patchValue({ date, adults: 2 });
    fixture.componentInstance.send();
    const text = decodeURIComponent(String(open.mock.calls[0]?.[0] ?? '').split('text=')[1] ?? '');
    expect(text).toContain('Adults: 2');
    expect(text).not.toContain('Amount');
    expect(text).not.toContain('Format');
    expect(text).not.toContain('Language');
    expect(text).not.toContain('{');
  });

  it('shows price, date picker, people stepper, language, and payment options', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const fixture = TestBed.createComponent(TourBook);
    fixture.componentRef.setInput('tour', tour);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[hlmCardTitle]')).toBeNull();
    expect(compiled.querySelector('#tour-due')?.textContent).toContain('FROM');
    expect(compiled.querySelector('#tour-due')?.textContent).toContain('$USD');
    expect(compiled.querySelector('#tour-due')?.textContent).toContain(String(PRICE));
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
      String(PRICE),
    );
    expect(compiled.querySelector('#tour-pay-deposit-amount')?.textContent).toContain(
      String(tourDuePrice(PRICE, 'deposit', 1, 0.2)),
    );
    expect(compiled.querySelector('#tour-language-label')?.textContent?.trim()).toBe('Language');
    expect(compiled.querySelector('.grid.grid-cols-2')).not.toBeNull();
    expect(compiled.querySelector('#tour-format-label')).not.toBeNull();
    expect(compiled.querySelector('#tour-name')).toBeNull();
    expect(compiled.querySelector('#tour-pay-full')).not.toBeNull();
    expect(compiled.querySelector('#tour-pay-deposit')).not.toBeNull();
    expect(compiled.textContent).toContain('Pay full price');
    expect(compiled.textContent).toContain('Book with 20% today');
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
    await fixture.whenStable();

    const deposit = fixture.nativeElement.querySelector(
      'label[for="tour-pay-deposit"]',
    ) as HTMLLabelElement;
    expect(deposit).not.toBeNull();
    deposit.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const due = fixture.nativeElement.querySelector('#tour-due') as HTMLElement;
    expect(due.textContent).toContain(String(tourDuePrice(PRICE, 'deposit', 1, 0.2)));
    expect(due.textContent).not.toContain(String(PRICE));
  });

  it('scales radio amounts when the party grows', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const fixture = TestBed.createComponent(TourBook);
    fixture.componentRef.setInput('tour', tour);
    await fixture.whenStable();

    fixture.componentInstance.form.controls.adults.setValue(2);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#tour-pay-full-amount')?.textContent).toContain(
      String(tourDuePrice(PRICE, 'full', 2, 0.2)),
    );
    expect(compiled.querySelector('#tour-pay-deposit-amount')?.textContent).toContain(
      String(tourDuePrice(PRICE, 'deposit', 2, 0.2)),
    );
    expect(compiled.querySelector('#tour-due')?.textContent).toContain(
      String(tourDuePrice(PRICE, 'full', 2, 0.2)),
    );
  });

  it('opens WhatsApp with adults, children, and payment', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    stubWhatsapp(TestBed);

    const fixture = TestBed.createComponent(TourBook);
    fixture.componentRef.setInput('tour', tour);
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
    expect(href.startsWith('https://wa.me/51987654321?text=')).toBe(true);
    const text = decodeURIComponent(href.split('text=')[1] ?? '');
    expect(text).toContain('Dune buggy');
    expect(text).toContain(formatTourDate(date));
    expect(text).toContain('English');
    expect(text).toContain('Adults: 3');
    expect(text).toContain('Children: 1');
    expect(text).not.toContain('People: 4');
    expect(text).toContain('Group');
    expect(text).not.toContain('Ana');
    expect(text).toContain('Book with 20% today');
    expect(text).toContain(`$USD ${tourDuePrice(PRICE, 'deposit', 4, 0.2)}`);
  });

  it('shows field errors, steps the party, and ignores unknown choices', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const fixture = TestBed.createComponent(TourBook);
    fixture.componentRef.setInput('tour', tour);
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
    expect(tourDuePrice(135, 'full', 1, 0.2)).toBe(135);
    expect(tourDuePrice(135, 'deposit', 1, 0.2)).toBe(27);
    expect(tourDuePrice(79, 'full', 2, 0.2)).toBe(158);
    expect(tourDuePrice(79, 'deposit', 2, 0.2)).toBe(32);
  });
});
