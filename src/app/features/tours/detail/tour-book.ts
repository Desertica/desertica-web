import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import { TourFormat, TourLanguage, TourPage } from '../../../core/catalog/tour-pages';
import { CatalogTour } from '../../../core/catalog/tours';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';
import { footerContact } from '../../../core/layout/footer-nav';
import {
  buildTourWhatsappHref,
  formatPickerDate,
  formatTourDate,
  startOfLocalDay,
} from './tour-whatsapp';

export const TOUR_ADULTS_MIN = 1;
export const TOUR_ADULTS_DEFAULT = 1;
export const TOUR_CHILDREN_MIN = 0;
export const TOUR_CHILDREN_DEFAULT = 0;
export const TOUR_PEOPLE_MAX = 12;
export const TOUR_DEPOSIT_RATE = 0.2;

export type TourPayment = 'full' | 'deposit';

type PartyKind = 'adults' | 'children';

export function tourDuePrice(unitPrice: number, payment: TourPayment, people = 1): number {
  const total = unitPrice * Math.max(people, 1);
  return payment === 'deposit' ? Math.round(total * TOUR_DEPOSIT_RATE) : total;
}

function paymentValue(value: unknown): TourPayment | null {
  if (value === 'full' || value === 'deposit') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    return paymentValue((value as { value: unknown }).value);
  }

  return null;
}

function partyMaxValidator(control: AbstractControl): ValidationErrors | null {
  const adults = Number(control.get('adults')?.value ?? 0);
  const children = Number(control.get('children')?.value ?? 0);
  return adults + children > TOUR_PEOPLE_MAX ? { party: true } : null;
}

@Component({
  selector: 'app-tour-book',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    NgIcon,
    HlmButton,
    HlmCardImports,
    HlmDatePickerImports,
    HlmFieldImports,
    HlmLabel,
    HlmPopoverImports,
    HlmRadioGroupImports,
    HlmToggleGroupImports,
  ],
  providers: [provideIcons({ lucideChevronDown })],
  host: {
    class: 'block w-full',
  },
  template: `
    <section hlmCard>
      <div hlmCardHeader>
        <p id="tour-due" class="font-heading text-2xl tracking-wide">
          {{ 'gallery.from' | translate: i18n.locale() }}
          {{ 'gallery.currency' | translate: i18n.locale() }}
          {{ duePrice() }}
        </p>
      </div>
      <form hlmCardContent class="flex flex-col gap-6" [formGroup]="form" (ngSubmit)="send()" novalidate>
        <div hlmField>
          <label hlmFieldLabel for="tour-date">{{ 'tour.date' | translate: i18n.locale() }}</label>
          <hlm-date-picker
            class="w-full"
            [formControl]="form.controls.date"
            [minDate]="minDate"
            [autoCloseOnSelect]="true"
            [formatDate]="formatPickerDate"
          >
            <hlm-date-picker-trigger buttonId="tour-date" class="w-full">
              {{ 'tour.date' | translate: i18n.locale() }}
            </hlm-date-picker-trigger>
          </hlm-date-picker>
          @if (showError('date')) {
            <hlm-field-error [forceShow]="true">{{
              'tour.dateError' | translate: i18n.locale()
            }}</hlm-field-error>
          }
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div hlmField [class.col-span-2]="!showFormat()">
            <span hlmFieldLabel id="tour-language-label">{{
              'tour.language' | translate: i18n.locale()
            }}</span>
            <hlm-toggle-group
              type="single"
              variant="outline"
              [value]="form.controls.language.value"
              (valueChange)="onLanguage($event)"
              aria-labelledby="tour-language-label"
            >
              <button hlmToggleGroupItem type="button" value="es">
                {{ 'lang.es' | translate: i18n.locale() }}
              </button>
              <button hlmToggleGroupItem type="button" value="en">
                {{ 'lang.en' | translate: i18n.locale() }}
              </button>
            </hlm-toggle-group>
            @if (showError('language')) {
              <hlm-field-error [forceShow]="true">{{
                'tour.languageError' | translate: i18n.locale()
              }}</hlm-field-error>
            }
          </div>

          @if (showFormat()) {
            <div hlmField>
              <span hlmFieldLabel id="tour-format-label">{{
                'tour.format' | translate: i18n.locale()
              }}</span>
              <hlm-toggle-group
                type="single"
                variant="outline"
                [value]="form.controls.format.value"
                (valueChange)="onFormat($event)"
                aria-labelledby="tour-format-label"
              >
                <button hlmToggleGroupItem type="button" value="shared">
                  {{ 'tour.shared' | translate: i18n.locale() }}
                </button>
                <button hlmToggleGroupItem type="button" value="private">
                  {{ 'tour.private' | translate: i18n.locale() }}
                </button>
              </hlm-toggle-group>
              @if (showError('format')) {
                <hlm-field-error [forceShow]="true">{{
                  'tour.formatError' | translate: i18n.locale()
                }}</hlm-field-error>
              }
            </div>
          }
        </div>

        <div hlmField>
          <span hlmFieldLabel id="tour-people-label">{{
            'tour.people' | translate: i18n.locale()
          }}</span>
          <hlm-popover align="start" sideOffset="5">
            <button
              type="button"
              id="tour-people"
              hlmPopoverTrigger
              class="bg-input/50 data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 inline-flex h-9 w-full items-center justify-between gap-1.5 rounded-3xl border border-transparent px-3 text-sm font-normal outline-none focus-visible:ring-3"
              aria-labelledby="tour-people-label"
            >
              <span class="truncate">{{ peopleSummary() }}</span>
              <ng-icon name="lucideChevronDown" class="text-muted-foreground ms-auto" />
            </button>
            <hlm-popover-content class="w-80" *hlmPopoverPortal="let ctx">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between gap-3">
                  <span>{{ 'tour.adultsAge' | translate: i18n.locale() }}</span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      hlmBtn
                      size="icon-sm"
                      variant="outline"
                      [disabled]="!canDecAdults()"
                      (click)="bump('adults', -1)"
                    >
                      −
                    </button>
                    <span class="w-6 text-center tabular-nums">{{ form.controls.adults.value }}</span>
                    <button
                      type="button"
                      hlmBtn
                      size="icon-sm"
                      variant="outline"
                      [disabled]="!canIncParty()"
                      (click)="bump('adults', 1)"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span>{{ 'tour.childrenAge' | translate: i18n.locale() }}</span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      hlmBtn
                      size="icon-sm"
                      variant="outline"
                      [disabled]="!canDecChildren()"
                      (click)="bump('children', -1)"
                    >
                      −
                    </button>
                    <span class="w-6 text-center tabular-nums">{{
                      form.controls.children.value
                    }}</span>
                    <button
                      type="button"
                      hlmBtn
                      size="icon-sm"
                      variant="outline"
                      [disabled]="!canIncParty()"
                      (click)="bump('children', 1)"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </hlm-popover-content>
          </hlm-popover>
          @if (showPeopleError()) {
            <hlm-field-error [forceShow]="true">{{
              'tour.peopleError' | translate: i18n.locale()
            }}</hlm-field-error>
          }
        </div>

        <fieldset hlmFieldSet>
          <legend hlmFieldLegend id="tour-payment-legend" variant="label" class="sr-only">
            {{ 'tour.payment' | translate: i18n.locale() }}
          </legend>
          <hlm-radio-group
            class="w-full"
            name="tour-payment"
            [value]="payment()"
            (valueChange)="onPayment($event)"
          >
            <label hlmLabel [class]="payOptionClass" for="tour-pay-full">
              <hlm-radio value="full" inputId="tour-pay-full">
                <hlm-radio-indicator indicator />
              </hlm-radio>
              <span class="flex min-w-0 flex-1 flex-col text-start">
                <span class="text-sm font-medium tracking-wide uppercase">{{
                  'tour.payFull' | translate: i18n.locale()
                }}</span>
                <span id="tour-pay-full-amount">
                  {{ 'gallery.currency' | translate: i18n.locale() }}
                  {{ fullPrice() }}
                </span>
              </span>
            </label>
            <label hlmLabel [class]="payOptionClass" for="tour-pay-deposit">
              <hlm-radio value="deposit" inputId="tour-pay-deposit">
                <hlm-radio-indicator indicator />
              </hlm-radio>
              <span class="flex min-w-0 flex-1 flex-col text-start">
                <span class="text-sm font-medium tracking-wide uppercase">{{
                  'tour.payLater' | translate: i18n.locale()
                }}</span>
                <span id="tour-pay-deposit-amount">
                  {{ 'gallery.currency' | translate: i18n.locale() }}
                  {{ depositPrice() }}
                </span>
              </span>
            </label>
          </hlm-radio-group>
        </fieldset>

        <button hlmBtn type="submit" class="w-full">
          {{ 'tour.book' | translate: i18n.locale() }}
        </button>
      </form>
    </section>
  `,
})
export class TourBook {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly tour = input.required<CatalogTour>();
  readonly page = input.required<TourPage>();
  protected readonly i18n = inject(I18nService);
  protected readonly minDate = startOfLocalDay();
  protected readonly formatPickerDate = formatPickerDate;
  protected readonly showFormat = computed(() => this.page().format === 'both');
  protected readonly payment = signal<TourPayment>('full');
  protected readonly partySize = signal(TOUR_ADULTS_DEFAULT + TOUR_CHILDREN_DEFAULT);
  protected readonly fullPrice = computed(() => this.tour().priceFrom * this.partySize());
  protected readonly depositPrice = computed(() =>
    tourDuePrice(this.tour().priceFrom, 'deposit', this.partySize()),
  );
  protected readonly duePrice = computed(() =>
    tourDuePrice(this.tour().priceFrom, this.payment(), this.partySize()),
  );
  protected readonly payOptionClass =
    'border-transparent bg-input/50 hover:bg-input/80 flex w-full cursor-pointer items-center gap-3 rounded-3xl border px-4 py-3.5 [&:has([data-checked=true])]:border-primary';

  readonly form = new FormGroup(
    {
      date: new FormControl<Date | null>(null, {
        validators: [Validators.required, (control) => this.notPast(control)],
      }),
      language: new FormControl<TourLanguage>(this.i18n.locale(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
      adults: new FormControl(TOUR_ADULTS_DEFAULT, {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.min(TOUR_ADULTS_MIN),
          Validators.max(TOUR_PEOPLE_MAX),
        ],
      }),
      children: new FormControl(TOUR_CHILDREN_DEFAULT, {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.min(TOUR_CHILDREN_MIN),
          Validators.max(TOUR_PEOPLE_MAX),
        ],
      }),
      format: new FormControl<Exclude<TourFormat, 'both'>>('shared', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      payment: new FormControl<TourPayment>('full', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [partyMaxValidator] },
  );

  constructor() {
    merge(this.form.controls.adults.valueChanges, this.form.controls.children.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.syncParty());
  }

  protected showError(name: 'date' | 'language' | 'format'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected showPeopleError(): boolean {
    const touched = this.form.controls.adults.touched || this.form.controls.children.touched;
    return (
      touched &&
      (this.form.hasError('party') ||
        this.form.controls.adults.invalid ||
        this.form.controls.children.invalid)
    );
  }

  protected peopleSummary(): string {
    const adults = this.form.controls.adults.value;
    const children = this.form.controls.children.value;
    const adultPart = `${adults} ${this.i18n.t(adults === 1 ? 'tour.adult' : 'tour.adults')}`;
    if (children === 0) {
      return adultPart;
    }

    const childPart = `${children} ${this.i18n.t(children === 1 ? 'tour.child' : 'tour.children')}`;
    return `${adultPart} · ${childPart}`;
  }

  protected canDecAdults(): boolean {
    return this.form.controls.adults.value > TOUR_ADULTS_MIN;
  }

  protected canDecChildren(): boolean {
    return this.form.controls.children.value > TOUR_CHILDREN_MIN;
  }

  protected canIncParty(): boolean {
    return this.form.controls.adults.value + this.form.controls.children.value < TOUR_PEOPLE_MAX;
  }

  private syncParty(): void {
    this.partySize.set(this.form.controls.adults.value + this.form.controls.children.value);
  }

  protected bump(kind: PartyKind, delta: 1 | -1): void {
    const adults = this.form.controls.adults.value;
    const children = this.form.controls.children.value;
    if (kind === 'adults') {
      const next = adults + delta;
      if (next < TOUR_ADULTS_MIN || next + children > TOUR_PEOPLE_MAX) {
        return;
      }

      this.form.controls.adults.setValue(next);
      return;
    }

    const next = children + delta;
    if (next < TOUR_CHILDREN_MIN || adults + next > TOUR_PEOPLE_MAX) {
      return;
    }

    this.form.controls.children.setValue(next);
  }

  protected onLanguage(value: unknown): void {
    if (value === 'es' || value === 'en') {
      this.form.controls.language.setValue(value);
    }
  }

  protected onFormat(value: unknown): void {
    if (value === 'shared' || value === 'private') {
      this.form.controls.format.setValue(value);
    }
  }

  protected onPayment(value: unknown): void {
    const next = paymentValue(value);
    if (!next) {
      return;
    }

    this.payment.set(next);
    this.form.controls.payment.setValue(next);
  }

  send(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const href = this.whatsappHref();
    if (!isPlatformBrowser(this.platformId) || !href) {
      return;
    }

    this.document.defaultView?.open(href, '_blank', 'noopener,noreferrer');
  }

  protected whatsappHref(): string {
    const page = this.page();
    const format = page.format === 'both' ? this.form.controls.format.value : page.format;
    const date = this.form.controls.date.value;
    const payment = this.form.controls.payment.value;
    const people = this.form.controls.adults.value + this.form.controls.children.value;
    return buildTourWhatsappHref(footerContact.whatsapp, this.i18n.t('tour.whatsappMessage'), {
      tour: this.i18n.t(this.tour().titleKey),
      date: date ? formatTourDate(date) : '',
      language: this.i18n.t(`lang.${this.form.controls.language.value}`),
      adults: String(this.form.controls.adults.value),
      children: String(this.form.controls.children.value),
      format: this.i18n.t(`tour.${format}`),
      payment: this.i18n.t(payment === 'deposit' ? 'tour.payLater' : 'tour.payFull'),
      amount: String(tourDuePrice(this.tour().priceFrom, payment, people)),
    });
  }

  private notPast(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      return null;
    }

    return startOfLocalDay(value) < this.minDate ? { past: true } : null;
  }
}
