import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
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
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import type { CountryCode } from 'libphonenumber-js/min';
import { CatalogService } from '../../core/catalog/catalog';
import { DEFAULT_FORMS } from '../../core/cms/booking-defaults';
import { AnalyticsService } from '../../core/analytics/analytics';
import { FormsApi } from '../../core/cms/forms-api';
import { PUBLIC_CONFIG } from '../../core/config/public-config';
import { Turnstile } from '../../core/forms/turnstile';
import { I18nService } from '../../core/i18n/i18n';
import { usePageMeta } from '../../core/seo/page-meta';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import {
  applyPhoneInput,
  CONTACT_BAND_IMAGE,
  DEFAULT_PHONE_COUNTRY,
  GEOJS_COUNTRY_URL,
  isValidWhatsapp,
  toE164,
  parseGeojsCountry,
  phoneCountries,
  type PhoneCountry,
} from './phone';

export const NAME_MIN = DEFAULT_FORMS.nameMin;
export const NAME_MAX = DEFAULT_FORMS.nameMax;
export const EMAIL_MAX = DEFAULT_FORMS.emailMax;
export const MESSAGE_MAX = DEFAULT_FORMS.messageMax;

@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage,
    ReactiveFormsModule,
    TranslatePipe,
    HlmButton,
    HlmComboboxImports,
    HlmFieldImports,
    HlmInput,
    HlmInputGroupImports,
    HlmTextarea,
    Turnstile,
  ],
  templateUrl: './contact.html',
})
export class Contact {
  private readonly destroyRef = inject(DestroyRef);
  private readonly phoneTouched = signal(false);
  private readonly forms = inject(FormsApi);
  private readonly analytics = inject(AnalyticsService);
  private readonly sending = signal(false);
  private readonly turnstile = viewChild(Turnstile);
  private readonly token = signal<string | null>(null);
  /** With a Turnstile site key the real challenge replaces the placeholder checkbox. */
  protected readonly turnstileEnabled = inject(PUBLIC_CONFIG).turnstileSiteKey !== null;

  protected readonly i18n = inject(I18nService);
  protected readonly bandImage = inject(CatalogService).mediaImage('contact.band', CONTACT_BAND_IMAGE);
  private readonly limits = inject(CatalogService).forms();
  protected readonly nameMax = this.limits.nameMax;
  protected readonly emailMax = this.limits.emailMax;
  protected readonly messageMax = this.limits.messageMax;
  protected readonly messageChars = signal(0);
  protected readonly countryCode = signal<CountryCode>(DEFAULT_PHONE_COUNTRY);
  protected readonly countries = computed(() => phoneCountries(this.i18n.locale()));
  protected readonly selectedCountry = computed(
    () =>
      this.countries().find((country) => country.code === this.countryCode()) ??
      this.countries()[0],
  );

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(this.limits.nameMin), Validators.maxLength(this.limits.nameMax)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(this.limits.emailMax)],
    }),
    whatsapp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, (control) => this.validateWhatsapp(control)],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(this.limits.messageMax)],
    }),
    captcha: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  constructor() {
    usePageMeta(() => ({
      title: this.i18n.t('nav.contact'),
      description: this.i18n.t('pages.contactLead'),
      breadcrumbs: [],
    }));

    afterNextRender(() => {
      void this.guessCountryFromIp();
    });
  }

  protected readonly countryToString = (item: PhoneCountry | null | undefined): string =>
    item ? `${item.label} +${item.callingCode} ${item.code}` : '';

  protected readonly sameCountry = (
    item: PhoneCountry | null | undefined,
    selected: PhoneCountry | null | undefined,
  ): boolean => item?.code === selected?.code;

  protected readonly messageCountLabel = computed(() =>
    this.i18n.t('contact.messageCount').replace('{count}', String(this.messageChars())),
  );

  protected nameErrorKey(): string {
    return this.form.controls.name.hasError('minlength')
      ? 'contact.nameMinError'
      : 'contact.nameError';
  }

  protected onMessageInput(): void {
    const value = this.form.controls.message.value;
    if (value.length > this.limits.messageMax) {
      this.form.controls.message.setValue(value.slice(0, this.limits.messageMax), {
        emitEvent: false,
      });
    }

    this.messageChars.set(this.form.controls.message.value.length);
  }

  protected onToken(token: string | null): void {
    this.token.set(token);
    this.form.controls.captcha.setValue(token !== null);
  }

  /** A Turnstile token works once, so every attempt needs a fresh challenge. */
  private resetChallenge(): void {
    if (this.turnstileEnabled) {
      this.turnstile()?.reset();
    }
  }

  protected showError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected onCountryPicked(value: unknown): void {
    const country = this.asPhoneCountry(value);
    if (!country || country.code === this.countryCode()) {
      return;
    }

    this.phoneTouched.set(true);
    this.setCountry(country.code);
  }

  protected onWhatsappInput(): void {
    this.phoneTouched.set(true);
    const applied = applyPhoneInput(this.form.controls.whatsapp.value, this.countryCode());
    if (applied.country !== this.countryCode()) {
      this.setCountry(applied.country);
    }

    if (applied.national !== this.form.controls.whatsapp.value) {
      this.form.controls.whatsapp.setValue(applied.national, { emitEvent: false });
    }
  }

  protected async send(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.sending()) {
      return;
    }

    const value = this.form.getRawValue();
    this.sending.set(true);
    const sent = await this.forms.submitContact({
      name: value.name.trim(),
      email: value.email.trim(),
      whatsapp: toE164(value.whatsapp, this.countryCode()) ?? value.whatsapp.trim(),
      country: this.countryCode(),
      message: value.message.trim(),
      locale: this.i18n.locale(),
      ...(this.token() ? { turnstileToken: this.token() as string } : {}),
    });
    this.sending.set(false);
    if (!sent) {
      this.resetChallenge();
      toast(this.i18n.t('contact.sendError'));
      return;
    }

    this.analytics.track('generate_lead', { form: 'contact' });
    toast(this.i18n.t('contact.thanks'));
    this.form.reset();
    this.resetChallenge();
    this.countryCode.set(DEFAULT_PHONE_COUNTRY);
    this.phoneTouched.set(false);
    this.messageChars.set(0);
  }

  private setCountry(code: CountryCode): void {
    this.countryCode.set(code);
    this.form.controls.whatsapp.updateValueAndValidity({ emitEvent: false });
  }

  private validateWhatsapp(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }

    return isValidWhatsapp(value, this.countryCode()) ? null : { whatsapp: true };
  }

  private asPhoneCountry(value: unknown): PhoneCountry | null {
    if (typeof value === 'object' && value !== null && 'code' in value) {
      const code = (value as PhoneCountry).code;
      return this.countries().find((country) => country.code === code) ?? null;
    }

    return null;
  }

  private async guessCountryFromIp(): Promise<void> {
    if (this.phoneTouched() || this.form.controls.whatsapp.value.trim()) {
      return;
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    this.destroyRef.onDestroy(abort);
    const timer = window.setTimeout(abort, 4000);

    try {
      const response = await fetch(GEOJS_COUNTRY_URL, { signal: controller.signal });
      if (!response.ok) {
        return;
      }

      const country = parseGeojsCountry(await response.json());
      if (!country || this.phoneTouched() || this.form.controls.whatsapp.value.trim()) {
        return;
      }

      this.setCountry(country);
    } catch {
      return;
    } finally {
      window.clearTimeout(timer);
    }
  }
}
