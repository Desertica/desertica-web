import { DatePipe, NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import type { CountryCode } from 'libphonenumber-js/min';
import { CatalogService } from '../../core/catalog/catalog';
import { type ComplaintPayload, FormsApi, type ProviderData } from '../../core/cms/forms-api';
import { ContentBody } from '../../core/cms/content-body';
import { COMPLAINT_LIMITS } from '../../core/forms/complaint-limits';
import { type IdDocType, ID_DOC_TYPES, isValidIdDocument } from '../../core/forms/id-document';
import { Turnstile } from '../../core/forms/turnstile';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';
import {
  applyPhoneInput,
  DEFAULT_PHONE_COUNTRY,
  isValidWhatsapp,
  type PhoneCountry,
  phoneCountries,
  toE164,
} from '../contact/phone';

/** Letters (any alphabet), spaces, apostrophes, dots and hyphens; no digits or symbols. */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOC_MAX: Record<IdDocType, number> = { DNI: 8, RUC: 11, CE: 12, PASSPORT: 12 };

const required = (max: number) =>
  new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(max)] });

const person = (max: number) =>
  new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(max), Validators.pattern(NAME_PATTERN)],
  });

/** Cross-field rules of the hoja: document fits its type, a guardian for a minor, an amount with its currency, one box at least in each choice. */
function complaintValidator(group: AbstractControl): ValidationErrors | null {
  const value = group.value as {
    idDocType: IdDocType;
    idDocNumber: string;
    amount: string;
    currency: string;
    isMinor: boolean;
    guardianName: string;
    isReclamo: boolean;
    isQueja: boolean;
    isProduct: boolean;
    isService: boolean;
  };
  const errors: ValidationErrors = {};
  if (!isValidIdDocument(value.idDocType, value.idDocNumber ?? '')) {
    errors['document'] = true;
  }

  if (value.isMinor && !NAME_PATTERN.test(value.guardianName?.trim() ?? '')) {
    errors['guardian'] = true;
  }

  const amount = value.amount?.trim();
  if (amount && (!/^\d+([.,]\d{1,2})?$/.test(amount) || !value.currency)) {
    errors['amount'] = true;
  }

  if (!value.isReclamo && !value.isQueja) {
    errors['kinds'] = true;
  }

  if (!value.isProduct && !value.isService) {
    errors['goods'] = true;
  }

  return Object.keys(errors).length ? errors : null;
}

const CHECKBOX = 'border-input accent-primary mt-0.5 size-5 shrink-0 rounded-sm border';

/**
 * Libro de Reclamaciones: the hoja de reclamación of INDECOPI (Anexo I) in four steps, one per
 * section of the form: consumer, contracted good, claim and request, and the send step that
 * stands for the provider's section (filled when we answer). The Express proxy validates the
 * payload again and files it through the API, which answers with the correlative number and
 * the legal reply deadline shown after submitting.
 */
@Component({
  selector: 'app-complaints-book',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    NgOptimizedImage,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ContentBody,
    HlmButton,
    HlmComboboxImports,
    HlmFieldImports,
    HlmInput,
    HlmInputGroupImports,
    HlmLabel,
    HlmTextarea,
    Turnstile,
  ],
  template: `
    <section class="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header class="flex flex-col gap-3">
        <h1 class="font-heading text-4xl">{{ 'complaints.title' | translate: i18n.locale() }}</h1>
        <p class="text-muted-foreground">{{ 'complaints.lead' | translate: i18n.locale() }}</p>
        <p class="text-sm">
          {{ provider().name }}@if (provider().ruc) { · {{ 'footer.ruc' | translate: i18n.locale() }} {{ provider().ruc }} }@if (provider().address) { · {{ provider().address }} }
        </p>
        @if (intro(); as markdown) {
          <app-content-body [markdown]="markdown" />
        }
      </header>

      @if (filed(); as result) {
        <div role="status" id="complaint-done" class="border-border flex flex-col gap-2 rounded-3xl border p-6">
          <h2 class="font-heading text-2xl">{{ 'complaints.doneTitle' | translate: i18n.locale() }}</h2>
          <p>
            {{ 'complaints.doneNumber' | translate: i18n.locale() }}
            <strong id="complaint-number">{{ result.correlative }}</strong>
          </p>
          <p>
            {{ 'complaints.doneDue' | translate: i18n.locale() }}
            <strong id="complaint-due">{{ result.dueAt | date: 'longDate' : undefined : i18n.locale() }}</strong>
          </p>
          <p class="text-muted-foreground text-sm">{{ 'complaints.doneCopy' | translate: i18n.locale() }}</p>
        </div>
      } @else {
        <form class="flex flex-col gap-8" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <nav [attr.aria-label]="'complaints.step' | translate: i18n.locale()" class="flex flex-col gap-2">
            <ol class="flex gap-2">
              @for (n of steps; track n) {
                <li class="h-1.5 flex-1 rounded-full" [class.bg-primary]="step() >= n" [class.bg-muted]="step() < n"></li>
              }
            </ol>
            <p class="text-muted-foreground text-sm" id="complaint-step">
              {{ 'complaints.step' | translate: i18n.locale() }} {{ step() }} / {{ steps.length }} ·
              {{ stepTitles[step() - 1] | translate: i18n.locale() }}
            </p>
          </nav>

          @if (step() === 1) {
            <fieldset hlmFieldSet>
              <legend hlmFieldLegend>{{ 'complaints.s1' | translate: i18n.locale() }}</legend>
              <div class="grid gap-4 sm:grid-cols-2">
                <div hlmField class="sm:col-span-2">
                  <label hlmFieldLabel for="cp-name">{{ 'complaints.name' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></label>
                  <input hlmInput id="cp-name" required [formControl]="form.controls.consumerName" autocomplete="name" [attr.maxlength]="limits.name" />
                  @if (invalid(form.controls.consumerName)) {
                    <hlm-field-error [forceShow]="true">{{ nameError(form.controls.consumerName) | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="cp-doc-type">{{ 'checkout.docType' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></label>
                  <select hlmInput id="cp-doc-type" required [formControl]="form.controls.idDocType">
                    @for (type of docTypes; track type) {
                      <option [value]="type">{{ 'checkout.doc.' + type | translate: i18n.locale() }}</option>
                    }
                  </select>
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="cp-doc-number">{{ 'checkout.docNumber' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></label>
                  <input
                    hlmInput
                    id="cp-doc-number"
                    required
                    [formControl]="form.controls.idDocNumber"
                    [attr.maxlength]="docMax()"
                    [attr.inputmode]="docNumeric() ? 'numeric' : 'text'"
                    autocomplete="off"
                    (input)="onDocInput()"
                  />
                  @if (form.controls.idDocNumber.touched && form.hasError('document') || submitted() && form.hasError('document')) {
                    <hlm-field-error [forceShow]="true">{{ (form.controls.idDocNumber.value ? 'checkout.errorDocument' : 'checkout.errorRequired') | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField class="sm:col-span-2">
                  <label hlmFieldLabel for="cp-address">{{ 'checkout.address' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></label>
                  <input hlmInput id="cp-address" required [formControl]="form.controls.address" autocomplete="street-address" [attr.maxlength]="limits.address" />
                  @if (invalid(form.controls.address)) {
                    <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="cp-email">{{ 'checkout.email' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></label>
                  <input hlmInput id="cp-email" required type="email" [formControl]="form.controls.email" autocomplete="email" [attr.maxlength]="limits.email" />
                  @if (invalid(form.controls.email)) {
                    <hlm-field-error [forceShow]="true">{{ (form.controls.email.value ? 'checkout.errorEmail' : 'checkout.errorRequired') | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="cp-phone">{{ 'complaints.phone' | translate: i18n.locale() }}</label>
                  <div hlmInputGroup class="min-w-0">
                    <hlm-input-group-addon class="ps-1">
                      <hlm-combobox
                        class="inline-flex"
                        [value]="selectedCountry()"
                        [itemToString]="countryToString"
                        [isItemEqualToValue]="sameCountry"
                        (valueChange)="onCountryPicked($event)"
                      >
                        <hlm-combobox-trigger
                          buttonId="cp-country"
                          variant="ghost"
                          class="h-8 min-w-0 gap-1.5 px-1.5 font-normal"
                          [attr.aria-label]="'contact.country' | translate: i18n.locale()"
                          [attr.data-country]="countryCode()"
                        >
                          <ng-template hlmComboboxValueTemplate let-value>
                            @if (value) {
                              <img [ngSrc]="value.flagSrc" width="40" height="27" alt="" class="h-5 w-auto rounded-sm" />
                              <span>+{{ value.callingCode }}</span>
                            }
                          </ng-template>
                        </hlm-combobox-trigger>
                        <hlm-combobox-content *hlmComboboxPortal class="min-w-72">
                          <hlm-combobox-input showTrigger="false" [placeholder]="'contact.searchCountry' | translate: i18n.locale()" />
                          <hlm-combobox-empty>{{ 'contact.noCountry' | translate: i18n.locale() }}</hlm-combobox-empty>
                          <div hlmComboboxList class="max-h-60 overflow-y-auto overscroll-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
                            @for (country of countries(); track country.code) {
                              <hlm-combobox-item [value]="country">
                                <img [src]="country.flagSrc" width="20" height="15" alt="" class="size-5 rounded-sm object-cover" />
                                <span class="min-w-0 flex-1 truncate">{{ country.label }}</span>
                                <span class="text-muted-foreground">+{{ country.callingCode }}</span>
                              </hlm-combobox-item>
                            }
                          </div>
                        </hlm-combobox-content>
                      </hlm-combobox>
                    </hlm-input-group-addon>
                    <input
                      hlmInputGroupInput
                      id="cp-phone"
                      type="tel"
                      autocomplete="tel"
                      inputmode="tel"
                      [attr.placeholder]="'contact.whatsappPlaceholder' | translate: i18n.locale()"
                      [formControl]="form.controls.phone"
                      (input)="onPhoneInput()"
                    />
                  </div>
                  @if (invalid(form.controls.phone)) {
                    <hlm-field-error [forceShow]="true">{{ 'complaints.phoneError' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
              </div>
              <label class="flex items-start gap-3 text-sm" for="cp-minor">
                <input type="checkbox" id="cp-minor" class="${CHECKBOX}" [formControl]="form.controls.isMinor" />
                {{ 'complaints.minor' | translate: i18n.locale() }}
              </label>
              @if (form.controls.isMinor.value) {
                <div hlmField>
                  <label hlmFieldLabel for="cp-guardian">{{ 'complaints.guardian' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></label>
                  <input hlmInput id="cp-guardian" required [formControl]="form.controls.guardianName" [attr.maxlength]="limits.guardian" autocomplete="off" />
                  @if (form.controls.guardianName.touched && form.hasError('guardian') || submitted() && form.hasError('guardian')) {
                    <hlm-field-error [forceShow]="true">{{ (form.controls.guardianName.value ? 'complaints.errorName' : 'checkout.errorRequired') | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
              }
            </fieldset>
          }

          @if (step() === 2) {
            <fieldset hlmFieldSet>
              <legend hlmFieldLegend>{{ 'complaints.s2' | translate: i18n.locale() }}</legend>
              <p class="text-muted-foreground text-sm">{{ 'complaints.goodHelp' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></p>
              <label class="flex items-center gap-3 text-sm" for="good-product">
                <input type="checkbox" id="good-product" class="${CHECKBOX}" [formControl]="form.controls.isProduct" />
                {{ 'complaints.product' | translate: i18n.locale() }}
              </label>
              <label class="flex items-center gap-3 text-sm" for="good-service">
                <input type="checkbox" id="good-service" class="${CHECKBOX}" [formControl]="form.controls.isService" />
                {{ 'complaints.service' | translate: i18n.locale() }}
              </label>
              @if (submitted() && form.hasError('goods')) {
                <hlm-field-error [forceShow]="true">{{ 'complaints.errorChoose' | translate: i18n.locale() }}</hlm-field-error>
              }
              <div class="grid gap-4 sm:grid-cols-3">
                <div hlmField>
                  <label hlmFieldLabel for="cp-ref">{{ 'complaints.bookingRef' | translate: i18n.locale() }}</label>
                  <input hlmInput id="cp-ref" [formControl]="form.controls.bookingRef" [attr.maxlength]="limits.bookingRef" autocomplete="off" />
                  @if (invalid(form.controls.bookingRef)) {
                    <hlm-field-error [forceShow]="true">{{ 'complaints.refError' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="cp-amount">{{ 'complaints.amount' | translate: i18n.locale() }}</label>
                  <input hlmInput id="cp-amount" inputmode="decimal" [formControl]="form.controls.amount" autocomplete="off" (input)="onAmountInput()" />
                  @if (submitted() && form.hasError('amount')) {
                    <hlm-field-error [forceShow]="true">{{ 'complaints.amountError' | translate: i18n.locale() }}</hlm-field-error>
                  }
                </div>
                <div hlmField>
                  <label hlmFieldLabel for="cp-currency">{{ 'booking.currency' | translate: i18n.locale() }}</label>
                  <select hlmInput id="cp-currency" [formControl]="form.controls.currency">
                    <option value="">—</option>
                    <option value="PEN">PEN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div hlmField>
                <label hlmFieldLabel for="cp-description">{{ 'complaints.description' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></label>
                <textarea hlmTextarea id="cp-description" required rows="2" [formControl]="form.controls.description" [attr.maxlength]="limits.description"></textarea>
                @if (invalid(form.controls.description)) {
                  <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                }
              </div>
            </fieldset>
          }

          @if (step() === 3) {
            <fieldset hlmFieldSet>
              <legend hlmFieldLegend>{{ 'complaints.s3' | translate: i18n.locale() }}</legend>
              <p class="text-muted-foreground text-sm">{{ 'complaints.kindHelp' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></p>
              <label class="flex items-start gap-3 text-sm" for="kind-reclamo">
                <input type="checkbox" id="kind-reclamo" class="${CHECKBOX}" [formControl]="form.controls.isReclamo" />
                <span><strong>{{ 'complaints.reclamo' | translate: i18n.locale() }}</strong> — {{ 'complaints.reclamoHelp' | translate: i18n.locale() }}</span>
              </label>
              <label class="flex items-start gap-3 text-sm" for="kind-queja">
                <input type="checkbox" id="kind-queja" class="${CHECKBOX}" [formControl]="form.controls.isQueja" />
                <span><strong>{{ 'complaints.queja' | translate: i18n.locale() }}</strong> — {{ 'complaints.quejaHelp' | translate: i18n.locale() }}</span>
              </label>
              @if (submitted() && form.hasError('kinds')) {
                <hlm-field-error [forceShow]="true">{{ 'complaints.errorChoose' | translate: i18n.locale() }}</hlm-field-error>
              }
              <div hlmField>
                <label hlmFieldLabel for="cp-detail">{{ 'complaints.detail' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></label>
                <textarea hlmTextarea id="cp-detail" required rows="5" [formControl]="form.controls.detail" [attr.maxlength]="limits.detail"></textarea>
                @if (invalid(form.controls.detail)) {
                  <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                }
              </div>
              <div hlmField>
                <label hlmFieldLabel for="cp-request">{{ 'complaints.request' | translate: i18n.locale() }} <span class="text-destructive" aria-hidden="true">*</span></label>
                <textarea hlmTextarea id="cp-request" required rows="3" [formControl]="form.controls.request" [attr.maxlength]="limits.request"></textarea>
                @if (invalid(form.controls.request)) {
                  <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                }
              </div>
            </fieldset>
          }

          @if (step() === 4) {
            <fieldset hlmFieldSet>
              <legend hlmFieldLegend>{{ 'complaints.s4' | translate: i18n.locale() }}</legend>
              <p class="text-muted-foreground text-sm">{{ 'complaints.s4Note' | translate: i18n.locale() }}</p>
              <dl class="border-border grid gap-3 rounded-2xl border p-4 text-sm sm:grid-cols-2" id="complaint-summary">
                @for (row of summary(); track row[0]) {
                  <div [class.sm:col-span-2]="row[2]">
                    <dt class="text-muted-foreground">{{ row[0] }}</dt>
                    <dd class="font-medium break-words whitespace-pre-line">{{ row[1] }}</dd>
                  </div>
                }
              </dl>
              <p class="text-muted-foreground text-sm">{{ 'complaints.legalNote' | translate: i18n.locale() }}</p>

              <app-turnstile (tokenChange)="token.set($event)" />
              @if (submitted() && turnstileRequired() && !token()) {
                <p class="text-destructive text-sm" role="alert">{{ 'contact.captchaError' | translate: i18n.locale() }}</p>
              }

              @if (error(); as key) {
                <p class="text-destructive text-sm" role="alert" id="complaint-error">{{ key | translate: i18n.locale() }}</p>
              }
            </fieldset>
          }

          <div class="flex flex-wrap gap-3">
            @if (step() > 1) {
              <button hlmBtn variant="outline" type="button" size="lg" id="complaint-back" (click)="back()">
                {{ 'complaints.back' | translate: i18n.locale() }}
              </button>
            }
            @if (step() < steps.length) {
              <button hlmBtn type="button" size="lg" id="complaint-next" (click)="next()">
                {{ 'complaints.next' | translate: i18n.locale() }}
              </button>
            } @else {
              <button hlmBtn type="submit" size="lg" id="complaint-submit" class="w-fit" [disabled]="sending()">
                {{ (sending() ? 'complaints.sending' : 'complaints.submit') | translate: i18n.locale() }}
              </button>
            }
          </div>
        </form>
      }

      <p class="text-muted-foreground text-sm">
        <a routerLink="/contact" class="underline underline-offset-4">{{ 'pages.contactTitle' | translate: i18n.locale() }}</a>
      </p>
    </section>
  `,
})
export class ComplaintsBook {
  private readonly forms = inject(FormsApi);
  private readonly catalog = inject(CatalogService);
  private readonly turnstile = viewChild(Turnstile);

  protected readonly i18n = inject(I18nService);
  protected readonly limits = COMPLAINT_LIMITS;
  protected readonly docTypes = ID_DOC_TYPES;
  protected readonly steps = [1, 2, 3, 4] as const;
  protected readonly stepTitles = ['complaints.s1', 'complaints.s2', 'complaints.s3', 'complaints.s4'] as const;
  protected readonly step = signal(1);
  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly token = signal<string | null>(null);
  protected readonly filed = signal<{ correlative: number; dueAt: string } | null>(null);
  protected readonly turnstileRequired = computed(() => this.turnstile()?.enabled === true);
  protected readonly legal = this.catalog.legal;
  /** The hoja's provider block comes from the API company; the CMS legal line is the fallback. */
  private readonly company = signal<ProviderData | null>(null);
  protected readonly provider = computed(() => {
    const company = this.company();
    return company
      ? { name: company.legalName, ruc: company.ruc as string | null, address: company.fiscalAddress as string | null }
      : { ...this.legal(), address: null as string | null };
  });
  /** Optional introduction written in the CMS `page` entry for `complaints`. */
  protected readonly intro = computed(() => {
    const page = this.catalog.page('complaints');
    return page ? (this.catalog.localized(page.i18n, this.i18n.locale())?.body ?? '') : '';
  });

  protected readonly countryCode = signal<CountryCode>(DEFAULT_PHONE_COUNTRY);
  protected readonly countries = computed(() => phoneCountries(this.i18n.locale()));
  protected readonly selectedCountry = computed(
    () => this.countries().find((country) => country.code === this.countryCode()) ?? this.countries()[0],
  );
  protected readonly countryToString = (item: PhoneCountry | null | undefined): string =>
    item ? `${item.label} +${item.callingCode} ${item.code}` : '';
  protected readonly sameCountry = (item: PhoneCountry | null | undefined, selected: PhoneCountry | null | undefined): boolean =>
    item?.code === selected?.code;

  readonly form = new FormGroup(
    {
      isReclamo: new FormControl(false, { nonNullable: true }),
      isQueja: new FormControl(false, { nonNullable: true }),
      isProduct: new FormControl(false, { nonNullable: true }),
      isService: new FormControl(false, { nonNullable: true }),
      consumerName: person(COMPLAINT_LIMITS.name),
      idDocType: new FormControl<IdDocType>('DNI', { nonNullable: true }),
      idDocNumber: required(12),
      address: required(COMPLAINT_LIMITS.address),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(COMPLAINT_LIMITS.email)],
      }),
      phone: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(COMPLAINT_LIMITS.phone), (control) => this.validatePhone(control)],
      }),
      isMinor: new FormControl(false, { nonNullable: true }),
      guardianName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(COMPLAINT_LIMITS.guardian), Validators.pattern(NAME_PATTERN)],
      }),
      bookingRef: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(COMPLAINT_LIMITS.bookingRef), Validators.pattern(/^[A-Za-z0-9_-]*$/)],
      }),
      amount: new FormControl('', { nonNullable: true }),
      currency: new FormControl<'' | 'USD' | 'PEN'>('', { nonNullable: true }),
      description: required(COMPLAINT_LIMITS.description),
      detail: required(COMPLAINT_LIMITS.detail),
      request: required(COMPLAINT_LIMITS.request),
    },
    { validators: complaintValidator },
  );

  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly docMax = computed(() => DOC_MAX[this.values().idDocType ?? 'DNI']);
  protected readonly docNumeric = computed(() => ['DNI', 'RUC'].includes(this.values().idDocType ?? 'DNI'));

  /** The review of step 4: what was typed, in the order of the hoja; the flag asks for the full row. */
  protected readonly summary = computed<[string, string, boolean][]>(() => {
    this.i18n.locale();
    const v = this.values();
    const t = (key: string) => this.i18n.t(key);
    const both = (a: boolean | undefined, b: boolean | undefined, ka: string, kb: string) =>
      [a ? t(ka) : '', b ? t(kb) : ''].filter(Boolean).join(' + ');
    const rows: [string, string, boolean][] = [
      [t('complaints.name'), v.consumerName ?? '', false],
      [t('checkout.docNumber'), `${v.idDocType ?? ''} ${v.idDocNumber ?? ''}`.trim(), false],
      [t('checkout.address'), v.address ?? '', false],
      [t('checkout.email'), v.email ?? '', false],
      [t('complaints.phone'), v.phone ?? '', false],
      [t('complaints.guardian'), v.isMinor ? (v.guardianName ?? '') : '', false],
      [t('complaints.good'), both(v.isProduct, v.isService, 'complaints.product', 'complaints.service'), false],
      [t('complaints.amountLabel'), v.amount && v.currency ? `${v.amount} ${v.currency}` : '', false],
      [t('complaints.description'), v.description ?? '', true],
      [t('complaints.kind'), both(v.isReclamo, v.isQueja, 'complaints.reclamo', 'complaints.queja'), false],
      [t('complaints.detail'), v.detail ?? '', true],
      [t('complaints.request'), v.request ?? '', true],
    ];
    return rows.filter(([, value]) => value.trim());
  });

  constructor() {
    afterNextRender(() => {
      void this.forms.company().then((company) => this.company.set(company));
    });
    this.form.controls.idDocType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.onDocInput());
    usePageMeta(() => ({
      title: this.i18n.t('complaints.title'),
      description: this.i18n.t('complaints.lead'),
      breadcrumbs: [],
    }));
  }

  protected invalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  protected nameError(control: AbstractControl): string {
    return control.hasError('required') ? 'checkout.errorRequired' : 'complaints.errorName';
  }

  /** Keeps only what the document type allows and the length it has. */
  protected onDocInput(): void {
    const control = this.form.controls.idDocNumber;
    const type = this.form.controls.idDocType.value;
    const raw = control.value;
    const cleaned = (['DNI', 'RUC'].includes(type) ? raw.replace(/\D/g, '') : raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()).slice(
      0,
      DOC_MAX[type],
    );
    if (cleaned !== raw) {
      control.setValue(cleaned);
    }
  }

  protected onAmountInput(): void {
    const control = this.form.controls.amount;
    const cleaned = control.value.replace(/[^\d.,]/g, '');
    if (cleaned !== control.value) {
      control.setValue(cleaned);
    }
  }

  protected onCountryPicked(value: unknown): void {
    const code = typeof value === 'object' && value !== null && 'code' in value ? (value as PhoneCountry).code : null;
    const country = this.countries().find((item) => item.code === code);
    if (country && country.code !== this.countryCode()) {
      this.countryCode.set(country.code);
      this.form.controls.phone.updateValueAndValidity();
    }
  }

  protected onPhoneInput(): void {
    const control = this.form.controls.phone;
    const applied = applyPhoneInput(control.value, this.countryCode());
    if (applied.country !== this.countryCode()) {
      this.countryCode.set(applied.country);
    }

    if (applied.national !== control.value) {
      control.setValue(applied.national, { emitEvent: false });
    }

    control.updateValueAndValidity();
  }

  private validatePhone(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    return !value || isValidWhatsapp(value, this.countryCode()) ? null : { phone: true };
  }

  /** Controls and group-level errors that belong to each step of the hoja. */
  private stepFields(step: number): { controls: AbstractControl[]; errors: string[] } {
    const c = this.form.controls;
    return [
      { controls: [c.consumerName, c.idDocType, c.idDocNumber, c.address, c.email, c.phone, c.isMinor, c.guardianName], errors: ['document', 'guardian'] },
      { controls: [c.isProduct, c.isService, c.bookingRef, c.amount, c.currency, c.description], errors: ['goods', 'amount'] },
      { controls: [c.isReclamo, c.isQueja, c.detail, c.request], errors: ['kinds'] },
      { controls: [], errors: [] },
    ][step - 1];
  }

  private stepValid(step: number): boolean {
    const { controls, errors } = this.stepFields(step);
    controls.forEach((control) => control.markAsTouched());
    return controls.every((control) => control.valid) && !errors.some((error) => this.form.hasError(error));
  }

  protected next(): void {
    this.submitted.set(true);
    if (this.stepValid(this.step())) {
      this.submitted.set(false);
      this.step.update((n) => Math.min(n + 1, this.steps.length));
    }
  }

  protected back(): void {
    this.submitted.set(false);
    this.step.update((n) => Math.max(n - 1, 1));
  }

  protected async submit(): Promise<void> {
    if (this.step() < this.steps.length) {
      this.next();
      return;
    }

    this.submitted.set(true);
    this.form.markAllAsTouched();
    const broken = this.steps.find((n) => !this.stepValid(n));
    if (broken) {
      this.step.set(broken);
      return;
    }

    if (this.form.invalid || this.sending() || (this.turnstileRequired() && !this.token())) {
      return;
    }

    this.sending.set(true);
    this.error.set(null);
    const result = await this.forms.submitComplaint(this.payload());
    this.sending.set(false);
    if (result.ok) {
      this.filed.set({ correlative: result.correlative, dueAt: result.dueAt });
      return;
    }

    // A Turnstile token works once, so a failed attempt needs a fresh challenge.
    this.turnstile()?.reset();
    this.token.set(null);
    this.error.set(
      {
        invalid: 'complaints.errorInvalid',
        captcha: 'contact.captchaError',
        rate_limited: 'booking.errorBusy',
        unavailable: 'complaints.errorUnavailable',
        error: 'complaints.errorGeneric',
      }[result.reason],
    );
  }

  private payload(): ComplaintPayload {
    const value = this.form.getRawValue();
    const optional = (input: string): string | undefined => input.trim() || undefined;
    const amount = value.amount.trim().replace(',', '.');
    const phone = value.phone.trim();
    return {
      kind: value.isReclamo && value.isQueja ? 'BOTH' : value.isReclamo ? 'RECLAMO' : 'QUEJA',
      goodType: value.isProduct && value.isService ? 'BOTH' : value.isProduct ? 'PRODUCT' : 'SERVICE',
      consumerName: value.consumerName.trim(),
      idDocType: value.idDocType,
      idDocNumber: value.idDocNumber.trim(),
      address: value.address.trim(),
      email: value.email.trim(),
      phone: phone ? (toE164(phone, this.countryCode()) ?? phone) : undefined,
      isMinor: value.isMinor || undefined,
      guardianName: value.isMinor ? optional(value.guardianName) : undefined,
      bookingRef: optional(value.bookingRef),
      ...(amount && value.currency
        ? { amountCents: Math.round(Number(amount) * 100), currency: value.currency }
        : {}),
      description: value.description.trim(),
      detail: value.detail.trim(),
      request: value.request.trim(),
      ...(this.token() ? { turnstileToken: this.token() as string } : {}),
    };
  }
}
