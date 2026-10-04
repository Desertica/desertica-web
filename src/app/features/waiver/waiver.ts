import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { BookingApi, type WaiverForm } from '../../core/api/booking-api';
import { limaDateLong, limaTime } from '../../core/booking/format';
import { CatalogService } from '../../core/catalog/catalog';
import { ContentBody } from '../../core/cms/content-body';
import { isValidIdDocument, type IdDocType } from '../../core/forms/id-document';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

/** A waiver is signed by a person, so a RUC (company) is not offered. */
const SIGNER_DOCS: readonly IdDocType[] = ['DNI', 'CE', 'PASSPORT'];

type Load = 'loading' | 'ready' | 'missing' | 'error';

/**
 * Liability waiver from the e-mailed link (`/waiver/:token`). The text is the tour's `waiverBody`
 * in the CMS, shown next to the version the API will record; without a text the form stays closed
 * because nobody should sign something they cannot read. A guardian signs for a minor by ticking
 * the box and giving their own details.
 */
@Component({
  selector: 'app-waiver',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ContentBody,
    HlmButton,
    HlmCardImports,
    HlmFieldImports,
    HlmInput,
    HlmTextarea,
  ],
  template: `
    <section class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 class="font-heading text-3xl">{{ 'waiver.title' | translate: i18n.locale() }}</h1>

      @switch (load()) {
        @case ('loading') {
          <p role="status">{{ 'waiver.loading' | translate: i18n.locale() }}</p>
        }
        @case ('missing') {
          <p role="alert" id="waiver-missing">{{ 'waiver.missing' | translate: i18n.locale() }}</p>
        }
        @case ('error') {
          <p class="text-destructive" role="alert">{{ 'waiver.loadError' | translate: i18n.locale() }}</p>
        }
        @default {
          @if (form(); as current) {
            <section hlmCard>
              <div hlmCardContent class="flex flex-col gap-1 text-sm">
                <p class="font-medium">{{ tourTitle() }}</p>
                <p>{{ date() }} · {{ time() }}</p>
                @if (current.passengerName) {
                  <p>{{ 'waiver.passenger' | translate: i18n.locale() }}: {{ current.passengerName }}</p>
                }
                @if (current.minAge) {
                  <p>{{ 'waiver.minAge' | translate: i18n.locale() }}: {{ current.minAge }}</p>
                }
                @if (current.minHeightCm) {
                  <p>{{ 'waiver.minHeight' | translate: i18n.locale() }}: {{ current.minHeightCm }} cm</p>
                }
                <p class="text-muted-foreground">{{ 'waiver.version' | translate: i18n.locale() }} {{ current.version }}</p>
              </div>
            </section>

            @if (current.status === 'SIGNED' || signed()) {
              <p role="status" id="waiver-signed" class="border-border rounded-3xl border p-4">
                {{ (signed() ? 'waiver.thanks' : 'waiver.alreadySigned') | translate: i18n.locale() }}
              </p>
            } @else if (!body()) {
              <p role="alert" id="waiver-no-text">{{ 'waiver.noText' | translate: i18n.locale() }}</p>
            } @else {
              <article class="border-border rounded-3xl border p-5" [attr.aria-label]="'waiver.title' | translate: i18n.locale()">
                <app-content-body [markdown]="body()" />
              </article>

              <form class="flex flex-col gap-6" [formGroup]="sign" (ngSubmit)="submit()" novalidate>
                <label class="flex items-start gap-3 text-sm" for="w-minor">
                  <input
                    type="checkbox"
                    id="w-minor"
                    class="border-input accent-primary mt-0.5 size-5 shrink-0 rounded-sm border"
                    formControlName="onBehalfOfMinor"
                    aria-describedby="w-minor-hint"
                  />
                  <span>
                    {{ 'waiver.minor' | translate: i18n.locale() }}
                    <span id="w-minor-hint" class="text-muted-foreground block">{{ 'waiver.minorHint' | translate: i18n.locale() }}</span>
                  </span>
                </label>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div hlmField class="sm:col-span-2">
                    <label hlmFieldLabel for="w-name">{{ 'waiver.signerName' | translate: i18n.locale() }}</label>
                    <input hlmInput id="w-name" formControlName="signerName" maxlength="160" autocomplete="name" />
                    @if (invalid('signerName')) {
                      <hlm-field-error [forceShow]="true">{{ 'checkout.errorRequired' | translate: i18n.locale() }}</hlm-field-error>
                    }
                  </div>
                  <div hlmField>
                    <label hlmFieldLabel for="w-doc-type">{{ 'checkout.docType' | translate: i18n.locale() }}</label>
                    <select hlmInput id="w-doc-type" formControlName="signerDocType">
                      @for (type of docTypes; track type) {
                        <option [value]="type">{{ 'checkout.doc.' + type | translate: i18n.locale() }}</option>
                      }
                    </select>
                  </div>
                  <div hlmField>
                    <label hlmFieldLabel for="w-doc-number">{{ 'checkout.docNumber' | translate: i18n.locale() }}</label>
                    <input hlmInput id="w-doc-number" formControlName="signerDocNumber" maxlength="12" autocomplete="off" />
                    @if (invalid('signerDocNumber') || documentInvalid()) {
                      <hlm-field-error [forceShow]="true">{{ 'checkout.errorDocument' | translate: i18n.locale() }}</hlm-field-error>
                    }
                  </div>
                  <div hlmField>
                    <label hlmFieldLabel for="w-emergency-name">{{ 'waiver.emergencyName' | translate: i18n.locale() }}</label>
                    <input hlmInput id="w-emergency-name" formControlName="emergencyContactName" maxlength="160" autocomplete="off" />
                  </div>
                  <div hlmField>
                    <label hlmFieldLabel for="w-emergency-phone">{{ 'waiver.emergencyPhone' | translate: i18n.locale() }}</label>
                    <input hlmInput id="w-emergency-phone" type="tel" formControlName="emergencyContactPhone" maxlength="32" autocomplete="off" />
                  </div>
                  <div hlmField class="sm:col-span-2">
                    <label hlmFieldLabel for="w-medical">{{ 'waiver.medical' | translate: i18n.locale() }}</label>
                    <textarea hlmTextarea id="w-medical" formControlName="medicalNotes" maxlength="1000" rows="3"></textarea>
                  </div>
                </div>

                <label class="flex items-start gap-3 text-sm" for="w-accept">
                  <input
                    type="checkbox"
                    id="w-accept"
                    class="border-input accent-primary mt-0.5 size-5 shrink-0 rounded-sm border"
                    formControlName="accepted"
                  />
                  <span>{{ 'waiver.accept' | translate: i18n.locale() }}</span>
                </label>
                @if (invalid('accepted')) {
                  <hlm-field-error [forceShow]="true">{{ 'checkout.errorAccept' | translate: i18n.locale() }}</hlm-field-error>
                }

                @if (error(); as message) {
                  <p class="text-destructive text-sm" role="alert" id="waiver-error">{{ message | translate: i18n.locale() }}</p>
                }
                <button hlmBtn type="submit" size="lg" id="waiver-sign" class="w-fit" [disabled]="sending()" [attr.aria-busy]="sending()">
                  {{ 'waiver.sign' | translate: i18n.locale() }}
                </button>
              </form>
            }
          }
        }
      }
    </section>
  `,
})
export class Waiver {
  private readonly api = inject(BookingApi);
  private readonly catalog = inject(CatalogService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Waiver token from the e-mailed path. */
  readonly token = input.required<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly docTypes = SIGNER_DOCS;
  protected readonly load = signal<Load>('loading');
  protected readonly form = signal<WaiverForm | null>(null);
  protected readonly signed = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly attempted = signal(false);

  protected readonly sign = new FormGroup({
    onBehalfOfMinor: new FormControl(false, { nonNullable: true }),
    signerName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(160)] }),
    signerDocType: new FormControl<IdDocType>('DNI', { nonNullable: true }),
    signerDocNumber: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(12)] }),
    emergencyContactName: new FormControl('', { nonNullable: true, validators: Validators.maxLength(160) }),
    emergencyContactPhone: new FormControl('', { nonNullable: true, validators: Validators.maxLength(32) }),
    medicalNotes: new FormControl('', { nonNullable: true, validators: Validators.maxLength(1000) }),
    accepted: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
  });

  private readonly tour = computed(() => {
    const slug = this.form()?.tourSlug;
    return slug ? this.catalog.tourById(slug) : undefined;
  });
  protected readonly tourTitle = computed(() => {
    const tour = this.tour();
    return tour ? this.i18n.t(tour.titleKey) : (this.form()?.tourSlug ?? '');
  });
  protected readonly date = computed(() => {
    const at = this.form()?.startsAt;
    return at ? limaDateLong(at, this.i18n.locale()) : '';
  });
  protected readonly time = computed(() => {
    const at = this.form()?.startsAt;
    return at ? limaTime(at, this.i18n.locale()) : '';
  });
  /** The CMS Markdown for this tour in the page language; empty when the tour defines none. */
  protected readonly body = computed(() => {
    const tour = this.tour();
    const key = tour ? this.catalog.tourPage(tour).waiverBodyKey : undefined;
    const text = key ? this.i18n.t(key) : '';
    return text && text !== key ? text : '';
  });

  constructor() {
    usePageMeta(() => ({ title: this.i18n.t('waiver.title'), noindex: true }));
    afterNextRender(() => void this.init());
  }

  protected invalid(name: keyof typeof this.sign.controls): boolean {
    const control = this.sign.controls[name];
    return control.invalid && (control.touched || this.attempted());
  }

  protected documentInvalid(): boolean {
    const { signerDocType, signerDocNumber } = this.sign.controls;
    return (
      (signerDocNumber.touched || this.attempted()) &&
      !!signerDocNumber.value &&
      !isValidIdDocument(signerDocType.value, signerDocNumber.value)
    );
  }

  protected async submit(): Promise<void> {
    this.attempted.set(true);
    this.sign.markAllAsTouched();
    const value = this.sign.getRawValue();
    if (this.sign.invalid || this.sending() || !isValidIdDocument(value.signerDocType, value.signerDocNumber)) {
      return;
    }

    const optional = (input: string): string | undefined => input.trim() || undefined;
    this.sending.set(true);
    this.error.set(null);
    const result = await this.api.signWaiver(this.token(), {
      signerName: value.signerName.trim(),
      signerDocType: value.signerDocType,
      signerDocNumber: value.signerDocNumber.trim(),
      onBehalfOfMinor: value.onBehalfOfMinor,
      medicalNotes: optional(value.medicalNotes),
      emergencyContactName: optional(value.emergencyContactName),
      emergencyContactPhone: optional(value.emergencyContactPhone),
      accepted: true,
    });
    this.sending.set(false);
    if (!result.ok) {
      this.error.set(
        result.status === 409
          ? 'waiver.errorSigned'
          : result.status === 429
            ? 'booking.errorBusy'
            : result.status === 422
              ? 'checkout.errorInvalid'
              : 'waiver.errorGeneric',
      );
      return;
    }

    this.form.set(result.data);
    this.signed.set(true);
  }

  private async init(): Promise<void> {
    if (!this.browser) {
      return;
    }

    const result = await this.api.waiver(this.token());
    if (!result.ok) {
      this.load.set(result.status === 404 || result.status === 410 ? 'missing' : 'error');
      return;
    }

    this.form.set(result.data);
    this.load.set('ready');
  }
}
