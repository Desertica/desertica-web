import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { AnalyticsService, centsToMajor } from '../../core/analytics/analytics';
import { tourItem } from '../../core/analytics/items';
import { AttributionService } from '../../core/analytics/attribution';
import { ConsentService } from '../../core/analytics/consent';
import { BookingApi, type CreatePublicBooking, type LegalDocument } from '../../core/api/booking-api';
import { CartService } from '../../core/booking/cart';
import { BookingFlow } from '../../core/booking/booking-flow';
import { cancellationTierLines, clock, formatMoney, limaDateLong, limaTime } from '../../core/booking/format';
import { CatalogService } from '../../core/catalog/catalog';
import { TourPrices } from '../../core/catalog/tour-prices';
import type { CountryCode } from 'libphonenumber-js/min';
import { applyPhoneInput, DEFAULT_PHONE_COUNTRY, isValidWhatsapp, type PhoneCountry, phoneCountries, toE164 } from '../contact/phone';
import { PhoneCountryPicker } from '../contact/phone-country';
import { type IdDocType, billingDocTypes, isValidIdDocument } from '../../core/forms/id-document';
import { Turnstile } from '../../core/forms/turnstile';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

type LegalKind = 'TERMS' | 'PRIVACY' | 'CANCELLATION';
const LEGAL_KINDS: readonly LegalKind[] = ['TERMS', 'PRIVACY', 'CANCELLATION'];
const LEGAL_PATH: Record<LegalKind, string> = {
  TERMS: '/terms',
  PRIVACY: '/privacy',
  CANCELLATION: '/terms',
};

const text = (max: number, required = true) =>
  new FormControl('', {
    nonNullable: true,
    validators: [...(required ? [Validators.required] : []), Validators.maxLength(max)],
  });

function personGroup() {
  return new FormGroup({ firstName: text(80), lastName: text(80) });
}

/** The document number has to fit the document type, and a factura needs an address. */
function billingValidator(group: AbstractControl): ValidationErrors | null {
  const value = group.value as { docType: string; idDocType: IdDocType; idDocNumber: string; address: string };
  const errors: ValidationErrors = {};
  if (!isValidIdDocument(value.idDocType, value.idDocNumber ?? '')) {
    errors['document'] = true;
  }

  if (value.docType === 'FACTURA' && !value.address?.trim()) {
    errors['address'] = true;
  }

  return Object.keys(errors).length ? errors : null;
}

/**
 * Checkout (booking engine only): countdown on the seat hold, customer, passengers, billing
 * document, the legal documents with the versions the API publishes, and the booking itself. Payment
 * is the next step (`CheckoutPayment`).
 */
@Component({
  selector: 'app-checkout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    HlmButton,
    HlmCardImports,
    HlmCheckbox,
    HlmComboboxImports,
    HlmFieldImports,
    HlmInput,
    HlmInputGroupImports,
    HlmLabel,
    HlmTextarea,
    HlmRadioGroupImports,
    HlmSelectImports,
    PhoneCountryPicker,
    Turnstile,
  ],
  template: `
    <section class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 class="font-heading text-3xl">{{ 'checkout.title' | translate: i18n.locale() }}</h1>

      @if (!flow.selection() || !flow.hold()) {
        <p id="checkout-empty">{{ 'checkout.empty' | translate: i18n.locale() }}</p>
        <a hlmBtn routerLink="/tours" class="w-fit">{{ 'nav.tours' | translate: i18n.locale() }}</a>
      } @else {
        @let selection = flow.selection()!;
        <section hlmCard>
          <div hlmCardContent class="flex flex-col gap-2 text-sm">
            <p class="font-medium" id="checkout-tour">{{ tourTitle() }}</p>
            <p>{{ date() }} · {{ time() }}</p>
            @if (selection.meetingPoint) {
              <p class="text-muted-foreground">{{ selection.meetingPoint }}</p>
            }
            <p>
              {{ selection.adults }} {{ (selection.adults === 1 ? 'tour.adult' : 'tour.adults') | translate: i18n.locale() }}
              @if (selection.children) {
                · {{ selection.children }} {{ (selection.children === 1 ? 'tour.child' : 'tour.children') | translate: i18n.locale() }}
              }
            </p>
            <p class="font-medium">
              {{ 'booking.total' | translate: i18n.locale() }}:
              <span id="checkout-total">{{ money(selection.quote.totalCents) }}</span>
            </p>
            <p
              id="checkout-timer"
              role="timer"
              [class]="flow.secondsLeft() <= 60 ? 'text-destructive font-medium' : 'text-muted-foreground'"
            >
              {{ 'checkout.holdLeft' | translate: i18n.locale() }}
              {{ countdown() }}
            </p>
          </div>
        </section>

        @if (flow.expired()) {
          <div role="alert" class="flex flex-col gap-3" id="checkout-expired">
            <p class="text-destructive">{{ 'checkout.expired' | translate: i18n.locale() }}</p>
            <button hlmBtn type="button" class="w-fit" (click)="startOver()">
              {{ 'checkout.chooseAgain' | translate: i18n.locale() }}
            </button>
          </div>
        } @else {
          <form class="flex flex-col gap-8" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <fieldset hlmFieldSet [formGroup]="form.controls.customer">
              <legend hlmFieldLegend>{{ 'checkout.customer' | translate: i18n.locale() }}</legend>
              <div class="grid gap-4 sm:grid-cols-2">
                <div hlmField>
                  <label hlmFieldLabel for="c-first">{{ 'checkout.firstName' | translate: i18n.locale() }}</label>
                  <input hlmInput id="c-first" formControlName="firstName" autocomplete="given-name" maxlength="80" />
                  @if (invalid(form.controls.customer.controls.firstName)) {
                    <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="c-last">{{ 'checkout.lastName' | translate: i18n.locale() }}</label>
                  <input hlmInput id="c-last" formControlName="lastName" autocomplete="family-name" maxlength="80" />
                  @if (invalid(form.controls.customer.controls.lastName)) {
                    <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="c-email">{{ 'checkout.email' | translate: i18n.locale() }}</label>
                  <input hlmInput id="c-email" type="email" formControlName="email" autocomplete="email" maxlength="254" />
                  @if (invalid(form.controls.customer.controls.email)) {
                    <hlm-field-error [forceShow]="true">{{ 'checkout.errorEmail' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField class="min-w-0">
                  <label hlmFieldLabel for="c-phone">{{ 'checkout.phone' | translate: i18n.locale() }}</label>
                  <div hlmInputGroup class="min-w-0">
                    <hlm-input-group-addon class="ps-1">
                      <app-phone-country buttonId="c-phone-country" [country]="phoneCountry()" (countryChange)="onPhoneCountry($event)" />
                    </hlm-input-group-addon>
                    <input
                      hlmInputGroupInput
                      id="c-phone"
                      type="tel"
                      inputmode="tel"
                      autocomplete="tel"
                      maxlength="32"
                      [attr.placeholder]="'contact.whatsappPlaceholder' | translate: i18n.locale()"
                      formControlName="phone"
                      (input)="onPhoneInput()"
                    />
                  </div>
                  @if (invalid(form.controls.customer.controls.phone)) {
                    <hlm-field-error [forceShow]="true">{{ 'complaints.phoneError' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField class="sm:col-span-2">
                  <label hlmFieldLabel for="c-country">{{ 'checkout.country' | translate: i18n.locale() }}</label>
                  <hlm-combobox [value]="customerCountry()" [itemToString]="countryLabel" [isItemEqualToValue]="sameCountry" (valueChange)="onCountry($event)">
                    <hlm-combobox-input inputId="c-country" [triggerAriaLabel]="'checkout.country' | translate: i18n.locale()" />
                    <hlm-combobox-content *hlmComboboxPortal>
                      <hlm-combobox-empty>{{ 'contact.noCountry' | translate: i18n.locale() }}</hlm-combobox-empty>
                      <div hlmComboboxList class="max-h-60 overflow-y-auto overscroll-contain">
                        @for (country of countries(); track country.code) {
                          <hlm-combobox-item [value]="country">{{ country.label }}</hlm-combobox-item>
                        }
                      </div>
                    </hlm-combobox-content>
                  </hlm-combobox>
                </div>
              </div>
            </fieldset>

            <fieldset hlmFieldSet>
              <legend hlmFieldLegend>{{ 'checkout.passengers' | translate: i18n.locale() }}</legend>
              <p class="text-muted-foreground text-sm">{{ 'checkout.passengersLead' | translate: i18n.locale() }}</p>
              @for (passenger of form.controls.passengers.controls; track $index) {
                <div class="grid gap-4 sm:grid-cols-2" [formGroup]="passenger">
                  <div hlmField>
                    <label hlmFieldLabel [for]="'p-first-' + $index">{{ 'checkout.passenger' | translate: i18n.locale() }} {{ $index + 1 }} · {{ 'checkout.firstName' | translate: i18n.locale() }}</label>
                    <input hlmInput [id]="'p-first-' + $index" formControlName="firstName" maxlength="80" />
                    @if (invalid(passenger.controls.firstName)) {
                      <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                    }
                  </div>
                  <div hlmField>
                    <label hlmFieldLabel [for]="'p-last-' + $index">{{ 'checkout.passenger' | translate: i18n.locale() }} {{ $index + 1 }} · {{ 'checkout.lastName' | translate: i18n.locale() }}</label>
                    <input hlmInput [id]="'p-last-' + $index" formControlName="lastName" maxlength="80" />
                    @if (invalid(passenger.controls.lastName)) {
                      <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                    }
                  </div>
                </div>
              }
            </fieldset>

            <fieldset hlmFieldSet [formGroup]="form.controls.billing">
              <legend hlmFieldLegend>{{ 'checkout.billing' | translate: i18n.locale() }}</legend>
              <p class="text-muted-foreground text-sm">{{ 'checkout.billingLead' | translate: i18n.locale() }}</p>
              <hlm-radio-group class="w-full" name="billing-docType" [value]="form.controls.billing.controls.docType.value" (valueChange)="onDocType($event)">
                <label hlmLabel class="flex items-center gap-3" for="b-boleta">
                  <hlm-radio value="BOLETA" inputId="b-boleta"><hlm-radio-indicator indicator /></hlm-radio>
                  {{ 'checkout.boleta' | translate: i18n.locale() }}
                </label>
                <label hlmLabel class="flex items-center gap-3" for="b-factura">
                  <hlm-radio value="FACTURA" inputId="b-factura"><hlm-radio-indicator indicator /></hlm-radio>
                  {{ 'checkout.factura' | translate: i18n.locale() }}
                </label>
              </hlm-radio-group>
              <div class="grid gap-4 sm:grid-cols-2">
                <div hlmField>
                  <label hlmFieldLabel for="b-type">{{ 'checkout.docType' | translate: i18n.locale() }}</label>
                  <hlm-select formControlName="idDocType" [itemToString]="docLabel">
                    <hlm-select-trigger buttonId="b-type" class="w-full">
                      <hlm-select-value />
                    </hlm-select-trigger>
                    <hlm-select-content *hlmSelectPortal>
                      @for (type of docTypes(); track type) {
                        <hlm-select-item [value]="type">{{ 'checkout.doc.' + type | translate: i18n.locale() }}</hlm-select-item>
                      }
                    </hlm-select-content>
                  </hlm-select>
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="b-number">{{ 'checkout.docNumber' | translate: i18n.locale() }}</label>
                  <input hlmInput id="b-number" formControlName="idDocNumber" maxlength="12" autocomplete="off" />
                  @if (submitted() && form.controls.billing.hasError('document')) {
                    <hlm-field-error [forceShow]="true">{{ 'checkout.errorDocument' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField class="sm:col-span-2">
                  <label hlmFieldLabel for="b-name">{{ 'checkout.billingName' | translate: i18n.locale() }}</label>
                  <input hlmInput id="b-name" formControlName="name" maxlength="200" />
                  @if (invalid(form.controls.billing.controls.name)) {
                    <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField class="sm:col-span-2">
                  <label hlmFieldLabel for="b-address">{{ (form.controls.billing.controls.docType.value === 'FACTURA' ? 'checkout.address' : 'checkout.addressOptional') | translate: i18n.locale() }}</label>
                  <input hlmInput id="b-address" formControlName="address" maxlength="200" autocomplete="street-address" />
                  @if (submitted() && form.controls.billing.hasError('address')) {
                    <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
              </div>
            </fieldset>

            <fieldset hlmFieldSet>
              <legend hlmFieldLegend>{{ 'checkout.payment' | translate: i18n.locale() }}</legend>
              <hlm-radio-group class="w-full" name="paymentKind" [value]="form.controls.paymentKind.value" (valueChange)="onPaymentKind($event)">
                <label hlmLabel class="flex items-center gap-3" for="k-full">
                  <hlm-radio value="FULL" inputId="k-full"><hlm-radio-indicator indicator /></hlm-radio>
                  {{ 'tour.payFull' | translate: i18n.locale() }} · {{ money(selection.quote.totalCents) }}
                </label>
                <label hlmLabel class="flex items-center gap-3" for="k-deposit">
                  <hlm-radio value="DEPOSIT" inputId="k-deposit"><hlm-radio-indicator indicator /></hlm-radio>
                  {{ 'checkout.payDeposit' | translate: i18n.locale() }} · {{ money(selection.quote.depositCents) }}
                </label>
              </hlm-radio-group>
            </fieldset>

            <div hlmField>
              <label hlmFieldLabel for="b-notes">{{ 'checkout.notes' | translate: i18n.locale() }}</label>
              <textarea hlmTextarea id="b-notes" rows="3" maxlength="1000" [formControl]="form.controls.notes"></textarea>
            </div>

            <fieldset hlmFieldSet>
              <legend hlmFieldLegend>{{ 'checkout.legal' | translate: i18n.locale() }}</legend>
              @if (legalFailed()) {
                <p class="text-destructive text-sm" role="alert" id="checkout-legal-error">{{ 'checkout.legalError' | translate: i18n.locale() }}</p>
              }
              @if (selection.quote.cancellationTiers?.length) {
                <ul class="text-muted-foreground list-disc ps-5 text-sm" id="checkout-tiers">
                  @for (line of tierLines(selection.quote.cancellationTiers); track $index) {
                    <li>{{ line }}</li>
                  }
                </ul>
              }
              @for (kind of legalKinds; track kind) {
                @let sentence = acceptSentence(kind);
                <label class="flex items-start gap-3 text-sm" [for]="'accept-' + kind">
                  <hlm-checkbox class="mt-0.5" [inputId]="'accept-' + kind" [formControl]="form.controls.accept.controls[kind]" />
                  <span>
                    {{ sentence.before }}<a [routerLink]="legalPath[kind]" target="_blank" class="underline underline-offset-4 focus-visible:underline">{{ sentence.link }}</a>{{ sentence.after }}
                    @if (legal()[kind]; as document) {
                      <span class="text-muted-foreground"> {{ versionNote(document.version) }}</span>
                    }
                  </span>
                </label>
                @if (invalid(form.controls.accept.controls[kind])) {
                  <hlm-field-error [forceShow]="true">{{ 'checkout.errorAccept' | translate: i18n.locale() }}</hlm-field-error>
                }
              }
              <p class="text-muted-foreground text-sm">
                <a routerLink="/complaints" class="underline underline-offset-4 focus-visible:underline">{{ 'checkout.complaints' | translate: i18n.locale() }}</a>
              </p>
            </fieldset>

            <app-turnstile (tokenChange)="token.set($event)" />
            @if (submitted() && turnstileRequired() && !token()) {
              <p class="text-destructive text-sm" role="alert">{{ 'contact.captchaError' | translate: i18n.locale() }}</p>
            }

            @if (error(); as key) {
              <p class="text-destructive text-sm" role="alert" id="checkout-error">{{ key | translate: i18n.locale() }}</p>
            }

            <div class="flex flex-col gap-3 sm:flex-row">
              <button hlmBtn type="submit" size="lg" id="checkout-submit" class="w-full sm:w-auto" [disabled]="sending()">
                {{ (sending() ? 'checkout.sending' : 'checkout.submit') | translate: i18n.locale() }}
              </button>
              <button hlmBtn type="button" variant="outline" size="lg" class="w-full sm:w-auto" (click)="startOver()">
                {{ 'checkout.chooseAgain' | translate: i18n.locale() }}
              </button>
            </div>
          </form>
        }
      }
    </section>
  `,
})
export class Checkout {
  private readonly api = inject(BookingApi);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly analytics = inject(AnalyticsService);
  private readonly prices = inject(TourPrices);
  private readonly attribution = inject(AttributionService);
  private readonly consent = inject(ConsentService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly turnstile = viewChild(Turnstile);
  /** Re-sent when a submission is retried after a network failure, so the API does not double-book. */
  private idempotencyKey: string | null = null;

  protected readonly i18n = inject(I18nService);
  protected readonly flow = inject(BookingFlow);
  private readonly cart = inject(CartService);
  protected readonly legalKinds = LEGAL_KINDS;
  protected readonly legalPath = LEGAL_PATH;
  protected readonly legal = signal<Partial<Record<LegalKind, LegalDocument>>>({});
  protected readonly legalFailed = signal(false);
  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly token = signal<string | null>(null);
  protected readonly turnstileRequired = computed(() => this.turnstile()?.enabled === true);
  protected readonly countries = computed(() => phoneCountries(this.i18n.locale()));
  protected readonly phoneCountry = signal<CountryCode>(DEFAULT_PHONE_COUNTRY);
  protected readonly docLabel = (type: string): string => this.i18n.t(`checkout.doc.${type}`);
  protected readonly countryLabel = (item: PhoneCountry | null | undefined): string => item?.label ?? '';
  protected readonly sameCountry = (item: PhoneCountry | null | undefined, selected: PhoneCountry | null | undefined): boolean =>
    item?.code === selected?.code;

  protected readonly form = new FormGroup({
    customer: new FormGroup({
      firstName: text(80),
      lastName: text(80),
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(254)] }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(32), (control) => this.validatePhone(control)] }),
      country: new FormControl<string>(DEFAULT_PHONE_COUNTRY, { nonNullable: true }),
    }),
    passengers: new FormArray<ReturnType<typeof personGroup>>([]),
    billing: new FormGroup(
      {
        docType: new FormControl<'BOLETA' | 'FACTURA'>('BOLETA', { nonNullable: true }),
        name: text(200),
        idDocType: new FormControl<IdDocType>('DNI', { nonNullable: true }),
        idDocNumber: text(12),
        address: text(200, false),
      },
      { validators: billingValidator },
    ),
    paymentKind: new FormControl<'FULL' | 'DEPOSIT'>('FULL', { nonNullable: true }),
    notes: text(1000, false),
    accept: new FormGroup({
      TERMS: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
      PRIVACY: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
      CANCELLATION: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
    }),
  });

  protected readonly docTypes = signal<readonly IdDocType[]>(billingDocTypes('BOLETA'));
  protected readonly tourTitle = computed(() => {
    const slug = this.flow.selection()?.tourSlug;
    const tour = slug ? this.catalog.tourById(slug) : undefined;
    return tour ? this.i18n.t(tour.titleKey) : (slug ?? '');
  });
  protected readonly date = computed(() => {
    const at = this.flow.selection()?.startsAt;
    return at ? limaDateLong(at, this.i18n.locale()) : '';
  });
  protected readonly time = computed(() => {
    const at = this.flow.selection()?.startsAt;
    return at ? limaTime(at, this.i18n.locale()) : '';
  });
  protected readonly countdown = computed(() => clock(this.flow.secondsLeft()));
  private readonly customerValue = toSignal(this.form.controls.customer.valueChanges, { initialValue: this.form.controls.customer.getRawValue() });
  protected readonly customerCountry = computed(() => {
    const code = this.customerValue().country;
    return this.countries().find((item) => item.code === code) ?? null;
  });

  constructor() {
    usePageMeta(() => ({ title: this.i18n.t('checkout.title'), noindex: true }));

    afterNextRender(() => {
      this.flow.restore();
      const selection = this.flow.selection();
      if (!selection) {
        return;
      }

      this.form.controls.paymentKind.setValue(selection.paymentKind ?? 'FULL');
      const party = selection.adults + selection.children;
      while (this.form.controls.passengers.length < party) {
        this.form.controls.passengers.push(personGroup());
      }

      void this.loadLegal();
    });

    // Keep the first passenger and the billing name in step with the customer until edited.
    this.form.controls.customer.valueChanges.subscribe((customer) => {
      const first = this.form.controls.passengers.at(0);
      if (first?.pristine) {
        first.setValue({ firstName: customer.firstName ?? '', lastName: customer.lastName ?? '' }, { emitEvent: false });
      }

      const billing = this.form.controls.billing.controls.name;
      if (billing.pristine && this.form.controls.billing.controls.docType.value === 'BOLETA') {
        billing.setValue(`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim(), { emitEvent: false });
      }
    });
  }

  protected invalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.flow.selection()?.currency ?? 'USD', this.i18n.locale());
  }

  protected tierLines(tiers: Parameters<typeof cancellationTierLines>[0]): string[] {
    return cancellationTierLines(tiers, (key) => this.i18n.t(key));
  }

  /** The whole sentence is one key per document; the part in brackets becomes the link. */
  protected acceptSentence(kind: LegalKind): { before: string; link: string; after: string } {
    const [before = '', link = '', after = ''] = this.i18n.t(`checkout.acceptDoc.${kind}`).split(/\[|\]/);
    return { before, link, after };
  }

  protected versionNote(version: number | string): string {
    return this.i18n.t('checkout.versionNote').replace('{version}', String(version));
  }

  protected onCountry(value: unknown): void {
    const code = (value as PhoneCountry | null)?.code;
    if (code) {
      this.form.controls.customer.controls.country.setValue(code);
    }
  }

  protected onPhoneCountry(code: CountryCode): void {
    this.phoneCountry.set(code);
    this.form.controls.customer.controls.phone.updateValueAndValidity();
  }

  protected onPhoneInput(): void {
    const control = this.form.controls.customer.controls.phone;
    const applied = applyPhoneInput(control.value, this.phoneCountry());
    this.phoneCountry.set(applied.country);
    if (applied.national !== control.value) {
      control.setValue(applied.national, { emitEvent: false });
    }

    control.updateValueAndValidity();
  }

  private validatePhone(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    return !value || isValidWhatsapp(value, this.phoneCountry()) ? null : { phone: true };
  }

  protected onDocType(value: unknown): void {
    if (value !== 'BOLETA' && value !== 'FACTURA') {
      return;
    }

    const billing = this.form.controls.billing.controls;
    billing.docType.setValue(value);
    const allowed = billingDocTypes(value);
    this.docTypes.set(allowed);
    if (!allowed.includes(billing.idDocType.value)) {
      billing.idDocType.setValue(allowed[0] ?? 'DNI');
    }

    this.form.controls.billing.updateValueAndValidity();
  }

  protected onPaymentKind(value: unknown): void {
    if (value === 'FULL' || value === 'DEPOSIT') {
      this.form.controls.paymentKind.setValue(value);
    }
  }

  protected async startOver(): Promise<void> {
    const slug = this.flow.selection()?.tourSlug;
    await this.flow.release();
    await this.router.navigateByUrl(slug ? `/tours/${slug}` : '/tours');
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    const selection = this.flow.selection();
    const hold = this.flow.hold();
    const documents = this.legal();
    const accepted = LEGAL_KINDS.map((kind) => documents[kind]?.id);
    if (
      !selection ||
      !hold ||
      this.sending() ||
      this.form.invalid ||
      accepted.some((id) => !id) ||
      (this.turnstileRequired() && !this.token())
    ) {
      return;
    }

    this.sending.set(true);
    this.error.set(null);
    this.idempotencyKey ??= crypto.randomUUID();
    const result = await this.api.createBooking(this.payload(selection.adults, selection.children, hold.token, selection.currency, accepted as string[]), this.idempotencyKey);
    this.sending.set(false);

    if (!result.ok) {
      this.turnstile()?.reset();
      this.token.set(null);
      if (result.status !== 0) {
        this.idempotencyKey = null;
      }

      this.error.set(
        result.status === 410
          ? 'checkout.expired'
          : result.status === 409
            ? 'checkout.errorSeats'
            : result.status === 422
              ? 'checkout.errorInvalid'
              : result.status === 429
                ? 'booking.errorBusy'
                : 'checkout.errorGeneric',
      );
      return;
    }

    const { booking, accessToken } = result.data;
    this.flow.remember(booking.reference, { accessToken });
    this.cart.remove(selection.departureId);
    const tour = this.catalog.tourById(selection.tourSlug);
    this.analytics.track('begin_checkout', {
      currency: selection.currency,
      value: centsToMajor(booking.totalCents),
      items: tour ? [{ ...tourItem(tour, this.i18n.t(tour.titleKey), selection.format, this.prices.amount(tour.id, selection.currency)), quantity: selection.adults + selection.children }] : [],
      event_id: booking.reference,
    });
    this.flow.clear();
    await this.router.navigateByUrl(`/checkout/payment/${encodeURIComponent(booking.reference)}`);
  }

  private payload(
    adults: number,
    children: number,
    holdToken: string,
    currency: 'USD' | 'PEN',
    legalIds: string[],
  ): CreatePublicBooking {
    const value = this.form.getRawValue();
    const optional = (input: string): string | undefined => input.trim() || undefined;
    const attribution = this.attribution.current();
    const anonymousId = this.consent.anonymousId();
    return {
      holdToken,
      currency,
      adults,
      children,
      customer: {
        firstName: value.customer.firstName.trim(),
        lastName: value.customer.lastName.trim(),
        email: value.customer.email.trim(),
        phone: value.customer.phone.trim() ? (toE164(value.customer.phone, this.phoneCountry()) ?? value.customer.phone.trim()) : undefined,
        country: value.customer.country,
        locale: this.i18n.locale(),
      },
      passengers: value.passengers.map((person) => ({
        firstName: person.firstName.trim(),
        lastName: person.lastName.trim(),
      })),
      billing: {
        docType: value.billing.docType,
        name: value.billing.name.trim(),
        idDocType: value.billing.idDocType,
        idDocNumber: value.billing.idDocNumber.trim(),
        address: optional(value.billing.address),
        email: value.customer.email.trim(),
      },
      paymentKind: value.paymentKind,
      acceptedLegalDocumentIds: legalIds,
      notes: optional(value.notes),
      locale: this.i18n.locale(),
      ...(attribution ? { attribution } : {}),
      ...(anonymousId ? { anonymousId } : {}),
      ...(this.token() ? { turnstileToken: this.token() as string } : {}),
    };
  }

  private async loadLegal(): Promise<void> {
    if (!this.browser) {
      return;
    }

    const result = await this.api.legalDocuments(this.i18n.locale());
    if (!result.ok) {
      this.legalFailed.set(true);
      return;
    }

    const byKind: Partial<Record<LegalKind, LegalDocument>> = {};
    for (const document of result.data.data) {
      if ((LEGAL_KINDS as readonly string[]).includes(document.kind)) {
        byKind[document.kind as LegalKind] = document;
      }
    }

    this.legal.set(byKind);
    this.legalFailed.set(LEGAL_KINDS.some((kind) => !byKind[kind]));
  }
}
