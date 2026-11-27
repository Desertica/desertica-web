import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import type { CountryCode } from 'libphonenumber-js/min';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { DEFAULT_PHONE_COUNTRY, type PhoneCountry, phoneCountries } from './phone';

/**
 * The country half of a phone field: flag and calling code, with a searchable list. It goes inside
 * the `hlm-input-group-addon` of the number input, so every form shows the same picker.
 */
@Component({
  selector: 'app-phone-country',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, TranslatePipe, HlmComboboxImports],
  host: { class: 'inline-flex' },
  template: `
    <hlm-combobox
      class="inline-flex"
      [value]="selected()"
      [itemToString]="toLabel"
      [isItemEqualToValue]="same"
      (valueChange)="pick($event)"
    >
      <hlm-combobox-trigger
        variant="ghost"
        class="h-9 min-w-0 gap-1.5 px-2 font-normal"
        [buttonId]="buttonId()"
        [attr.aria-label]="'contact.country' | translate: i18n.locale()"
        [attr.data-country]="country()"
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
          @for (item of countries(); track item.code) {
            <hlm-combobox-item [value]="item">
              <img [src]="item.flagSrc" width="20" height="15" alt="" class="size-5 rounded-sm object-cover" />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              <span class="text-muted-foreground">+{{ item.callingCode }}</span>
            </hlm-combobox-item>
          }
        </div>
      </hlm-combobox-content>
    </hlm-combobox>
  `,
})
export class PhoneCountryPicker {
  protected readonly i18n = inject(I18nService);
  /** Id of the trigger button, for tests and `aria` links. */
  readonly buttonId = input.required<string>();
  readonly country = model<CountryCode>(DEFAULT_PHONE_COUNTRY);

  protected readonly countries = computed(() => phoneCountries(this.i18n.locale()));
  protected readonly selected = computed(
    () => this.countries().find((item) => item.code === this.country()) ?? this.countries()[0],
  );

  protected readonly toLabel = (item: PhoneCountry | null | undefined): string =>
    item ? `${item.label} +${item.callingCode} ${item.code}` : '';
  protected readonly same = (item: PhoneCountry | null | undefined, selected: PhoneCountry | null | undefined): boolean =>
    item?.code === selected?.code;

  protected pick(value: unknown): void {
    const code = typeof value === 'object' && value !== null && 'code' in value ? (value as PhoneCountry).code : null;
    if (code && code !== this.country() && this.countries().some((item) => item.code === code)) {
      this.country.set(code);
    }
  }
}
