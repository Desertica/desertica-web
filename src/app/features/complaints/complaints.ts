import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { CatalogService } from '../../core/catalog/catalog';
import { type ComplaintPayload, FormsApi } from '../../core/cms/forms-api';
import { ContentBody } from '../../core/cms/content-body';
import { COMPLAINT_LIMITS } from '../../core/forms/complaint-limits';
import { type IdDocType, ID_DOC_TYPES, isValidIdDocument } from '../../core/forms/id-document';
import { Turnstile } from '../../core/forms/turnstile';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

const required = (max: number) =>
  new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(max)] });

/** The amount (major units) needs a currency, and the document number has to fit its type. */
function complaintValidator(group: AbstractControl): ValidationErrors | null {
  const value = group.value as { idDocType: IdDocType; idDocNumber: string; amount: string; currency: string };
  const errors: ValidationErrors = {};
  if (!isValidIdDocument(value.idDocType, value.idDocNumber ?? '')) {
    errors['document'] = true;
  }

  const amount = value.amount?.trim();
  if (amount && (!/^\d+([.,]\d{1,2})?$/.test(amount) || !value.currency)) {
    errors['amount'] = true;
  }

  return Object.keys(errors).length ? errors : null;
}

/**
 * Libro de Reclamaciones: a public complaints book. The form carries every field of
 * `CreateComplaint`; the Express proxy validates it again and files it through the API, which
 * answers with the correlative number and the legal reply deadline shown after submitting.
 */
@Component({
  selector: 'app-complaints-book',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ContentBody,
    HlmButton,
    HlmFieldImports,
    HlmInput,
    HlmLabel,
    HlmRadioGroupImports,
    HlmTextarea,
    Turnstile,
  ],
  template: `
    <section class="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header class="flex flex-col gap-3">
        <h1 class="font-heading text-4xl">{{ 'complaints.title' | translate: i18n.locale() }}</h1>
        <p class="text-muted-foreground">{{ 'complaints.lead' | translate: i18n.locale() }}</p>
        <p class="text-sm">
          {{ legal().name }} · {{ 'footer.ruc' | translate: i18n.locale() }} {{ legal().ruc }}
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
          <fieldset hlmFieldSet>
            <legend hlmFieldLegend>{{ 'complaints.kind' | translate: i18n.locale() }}</legend>
            <hlm-radio-group class="w-full" name="complaint-kind" [value]="form.controls.kind.value" (valueChange)="onKind($event)">
              <label hlmLabel class="flex items-start gap-3" for="kind-reclamo">
                <hlm-radio value="RECLAMO" inputId="kind-reclamo"><hlm-radio-indicator indicator /></hlm-radio>
                <span><strong>{{ 'complaints.reclamo' | translate: i18n.locale() }}</strong> — {{ 'complaints.reclamoHelp' | translate: i18n.locale() }}</span>
              </label>
              <label hlmLabel class="flex items-start gap-3" for="kind-queja">
                <hlm-radio value="QUEJA" inputId="kind-queja"><hlm-radio-indicator indicator /></hlm-radio>
                <span><strong>{{ 'complaints.queja' | translate: i18n.locale() }}</strong> — {{ 'complaints.quejaHelp' | translate: i18n.locale() }}</span>
              </label>
            </hlm-radio-group>
          </fieldset>

          <fieldset hlmFieldSet>
            <legend hlmFieldLegend>{{ 'complaints.consumer' | translate: i18n.locale() }}</legend>
            <div class="grid gap-4 sm:grid-cols-2">
              <div hlmField class="sm:col-span-2">
                <label hlmFieldLabel for="cp-name">{{ 'complaints.name' | translate: i18n.locale() }}</label>
                <input hlmInput id="cp-name" [formControl]="form.controls.consumerName" autocomplete="name" [attr.maxlength]="limits.name" />
                @if (invalid(form.controls.consumerName)) {
                  <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                }
              </div>
              <div hlmField>
                <label hlmFieldLabel for="cp-doc-type">{{ 'checkout.docType' | translate: i18n.locale() }}</label>
                <select hlmInput id="cp-doc-type" [formControl]="form.controls.idDocType">
                  @for (type of docTypes; track type) {
                    <option [value]="type">{{ 'checkout.doc.' + type | translate: i18n.locale() }}</option>
                  }
                </select>
              </div>
              <div hlmField>
                <label hlmFieldLabel for="cp-doc-number">{{ 'checkout.docNumber' | translate: i18n.locale() }}</label>
                <input hlmInput id="cp-doc-number" [formControl]="form.controls.idDocNumber" maxlength="12" autocomplete="off" />
                @if (submitted() && form.hasError('document')) {
                  <hlm-field-error [forceShow]="true">{{ 'checkout.errorDocument' | translate: i18n.locale() }}</hlm-field-error>
                }
              </div>
              <div hlmField class="sm:col-span-2">
                <label hlmFieldLabel for="cp-address">{{ 'checkout.address' | translate: i18n.locale() }}</label>
                <input hlmInput id="cp-address" [formControl]="form.controls.address" autocomplete="street-address" [attr.maxlength]="limits.address" />
                @if (invalid(form.controls.address)) {
                  <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                }
              </div>
              <div hlmField>
                <label hlmFieldLabel for="cp-email">{{ 'checkout.email' | translate: i18n.locale() }}</label>
                <input hlmInput id="cp-email" type="email" [formControl]="form.controls.email" autocomplete="email" [attr.maxlength]="limits.email" />
                @if (invalid(form.controls.email)) {
                  <hlm-field-error [forceShow]="true">{{ 'checkout.errorEmail' | translate: i18n.locale() }}</hlm-field-error>
                }
              </div>
              <div hlmField>
                <label hlmFieldLabel for="cp-phone">{{ 'checkout.phone' | translate: i18n.locale() }}</label>
                <input hlmInput id="cp-phone" type="tel" [formControl]="form.controls.phone" autocomplete="tel" [attr.maxlength]="limits.phone" />
              </div>
            </div>
            <label class="flex items-start gap-3 text-sm" for="cp-minor">
              <input type="checkbox" id="cp-minor" class="border-input accent-primary mt-0.5 size-5 shrink-0 rounded-sm border" [formControl]="form.controls.isMinor" />
              {{ 'complaints.minor' | translate: i18n.locale() }}
            </label>
          </fieldset>

          <fieldset hlmFieldSet>
            <legend hlmFieldLegend>{{ 'complaints.good' | translate: i18n.locale() }}</legend>
            <hlm-radio-group class="w-full" name="complaint-good" [value]="form.controls.goodType.value" (valueChange)="onGood($event)">
              <label hlmLabel class="flex items-center gap-3" for="good-service">
                <hlm-radio value="SERVICE" inputId="good-service"><hlm-radio-indicator indicator /></hlm-radio>
                {{ 'complaints.service' | translate: i18n.locale() }}
              </label>
              <label hlmLabel class="flex items-center gap-3" for="good-product">
                <hlm-radio value="PRODUCT" inputId="good-product"><hlm-radio-indicator indicator /></hlm-radio>
                {{ 'complaints.product' | translate: i18n.locale() }}
              </label>
            </hlm-radio-group>
            <div class="grid gap-4 sm:grid-cols-3">
              <div hlmField>
                <label hlmFieldLabel for="cp-ref">{{ 'complaints.bookingRef' | translate: i18n.locale() }}</label>
                <input hlmInput id="cp-ref" [formControl]="form.controls.bookingRef" [attr.maxlength]="limits.bookingRef" autocomplete="off" />
              </div>
              <div hlmField>
                <label hlmFieldLabel for="cp-amount">{{ 'complaints.amount' | translate: i18n.locale() }}</label>
                <input hlmInput id="cp-amount" inputmode="decimal" [formControl]="form.controls.amount" autocomplete="off" />
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
              <label hlmFieldLabel for="cp-description">{{ 'complaints.description' | translate: i18n.locale() }}</label>
              <textarea hlmTextarea id="cp-description" rows="2" [formControl]="form.controls.description" [attr.maxlength]="limits.description"></textarea>
              @if (invalid(form.controls.description)) {
                <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
              }
            </div>
          </fieldset>

          <fieldset hlmFieldSet>
            <legend hlmFieldLegend>{{ 'complaints.claim' | translate: i18n.locale() }}</legend>
            <div hlmField>
              <label hlmFieldLabel for="cp-detail">{{ 'complaints.detail' | translate: i18n.locale() }}</label>
              <textarea hlmTextarea id="cp-detail" rows="5" [formControl]="form.controls.detail" [attr.maxlength]="limits.detail"></textarea>
              @if (invalid(form.controls.detail)) {
                <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
              }
            </div>
            <div hlmField>
              <label hlmFieldLabel for="cp-request">{{ 'complaints.request' | translate: i18n.locale() }}</label>
              <textarea hlmTextarea id="cp-request" rows="3" [formControl]="form.controls.request" [attr.maxlength]="limits.request"></textarea>
              @if (invalid(form.controls.request)) {
                <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
              }
            </div>
          </fieldset>

          <p class="text-muted-foreground text-sm">{{ 'complaints.legalNote' | translate: i18n.locale() }}</p>

          <app-turnstile (tokenChange)="token.set($event)" />
          @if (submitted() && turnstileRequired() && !token()) {
            <p class="text-destructive text-sm" role="alert">{{ 'contact.captchaError' | translate: i18n.locale() }}</p>
          }

          @if (error(); as key) {
            <p class="text-destructive text-sm" role="alert" id="complaint-error">{{ key | translate: i18n.locale() }}</p>
          }

          <button hlmBtn type="submit" size="lg" id="complaint-submit" class="w-fit" [disabled]="sending()">
            {{ (sending() ? 'complaints.sending' : 'complaints.submit') | translate: i18n.locale() }}
          </button>
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
  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly token = signal<string | null>(null);
  protected readonly filed = signal<{ correlative: number; dueAt: string } | null>(null);
  protected readonly turnstileRequired = computed(() => this.turnstile()?.enabled === true);
  protected readonly legal = computed(() => ({
    name: this.catalog.site().legalName,
    ruc: this.catalog.site().ruc,
  }));
  /** Optional introduction written in the CMS `page` entry for `complaints`. */
  protected readonly intro = computed(() => {
    const page = this.catalog.page('complaints');
    return page ? (this.catalog.localized(page.i18n, this.i18n.locale())?.body ?? '') : '';
  });

  readonly form = new FormGroup(
    {
      kind: new FormControl<'RECLAMO' | 'QUEJA'>('RECLAMO', { nonNullable: true }),
      goodType: new FormControl<'PRODUCT' | 'SERVICE'>('SERVICE', { nonNullable: true }),
      consumerName: required(COMPLAINT_LIMITS.name),
      idDocType: new FormControl<IdDocType>('DNI', { nonNullable: true }),
      idDocNumber: required(12),
      address: required(COMPLAINT_LIMITS.address),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(COMPLAINT_LIMITS.email)],
      }),
      phone: new FormControl('', { nonNullable: true, validators: Validators.maxLength(COMPLAINT_LIMITS.phone) }),
      isMinor: new FormControl(false, { nonNullable: true }),
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

  constructor() {
    usePageMeta(() => ({
      title: this.i18n.t('complaints.title'),
      description: this.i18n.t('complaints.lead'),
      breadcrumbs: [],
    }));
  }

  protected invalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  protected onKind(value: unknown): void {
    if (value === 'RECLAMO' || value === 'QUEJA') {
      this.form.controls.kind.setValue(value);
    }
  }

  protected onGood(value: unknown): void {
    if (value === 'PRODUCT' || value === 'SERVICE') {
      this.form.controls.goodType.setValue(value);
    }
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
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
    return {
      kind: value.kind,
      goodType: value.goodType,
      consumerName: value.consumerName.trim(),
      idDocType: value.idDocType,
      idDocNumber: value.idDocNumber.trim(),
      address: value.address.trim(),
      email: value.email.trim(),
      phone: optional(value.phone),
      isMinor: value.isMinor || undefined,
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
