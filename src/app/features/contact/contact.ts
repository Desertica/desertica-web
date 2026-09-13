import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
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
import { afterNextGsapUi } from '../../core/animation/gsap-ui';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import {
  applyPhoneInput,
  CONTACT_BAND_IMAGE,
  DEFAULT_PHONE_COUNTRY,
  GEOJS_COUNTRY_URL,
  isValidWhatsapp,
  parseGeojsCountry,
  phoneCountries,
  type PhoneCountry,
} from './phone';

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
  ],
  templateUrl: './contact.html',
})
export class Contact {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly phoneTouched = signal(false);

  protected readonly i18n = inject(I18nService);
  protected readonly bandImage = CONTACT_BAND_IMAGE;
  protected readonly countryCode = signal<CountryCode>(DEFAULT_PHONE_COUNTRY);
  protected readonly countries = computed(() => phoneCountries(this.i18n.locale()));
  protected readonly selectedCountry = computed(
    () =>
      this.countries().find((country) => country.code === this.countryCode()) ??
      this.countries()[0],
  );

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    whatsapp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, (control) => this.validateWhatsapp(control)],
    }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    captcha: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  constructor() {
    afterNextGsapUi((gsap) => {
      const items = this.host.nativeElement.querySelectorAll('.contact-enter');
      if (!items.length) {
        return;
      }

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return gsap.context(() => {
        gsap.from(items, {
          autoAlpha: reduced ? 1 : 0,
          y: reduced ? 0 : 16,
          duration: reduced ? 0 : 0.6,
          stagger: reduced ? 0 : 0.08,
          ease: 'power2.out',
        });
      }, this.host.nativeElement);
    });

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

  protected send(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    toast(this.i18n.t('contact.thanks'));
    this.form.reset();
    this.countryCode.set(DEFAULT_PHONE_COUNTRY);
    this.phoneTouched.set(false);
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
