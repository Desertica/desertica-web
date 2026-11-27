import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import type { Currency } from '../api/booking-api';
import { CURRENCIES, CurrencyService } from '../currency/currency';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';
import { SWITCH_ITEM_CLASS } from './locale-switcher';

/** Same look as the language selector: S/ / $, with the code on very wide screens (the header row has no room for it below 2xl) and in the mobile menu. */
@Component({
  selector: 'app-currency-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmToggleGroupImports, TranslatePipe],
  host: { class: 'contents' },
  template: `
    @if (size() === 'lg') {
      <span class="text-muted-foreground w-20 text-sm" aria-hidden="true">{{
        'a11y.chooseCurrency' | translate: i18n.locale()
      }}</span>
    }
    <hlm-toggle-group
      class="shrink-0 lg:max-xl:gap-0"
      type="single"
      spacing="1"
      [size]="size()"
      [nullable]="false"
      [value]="currency.currency()"
      (valueChange)="choose($event)"
      [attr.aria-label]="'a11y.chooseCurrency' | translate: i18n.locale()"
    >
      @for (code of codes; track code; let first = $first) {
        @if (!first) {
          <span class="text-muted-foreground/50 select-none" aria-hidden="true">/</span>
        }
        <button
          hlmToggleGroupItem
          type="button"
          [value]="code"
          [class]="itemClass"
          [aria-label]="'currencies.' + code | translate: i18n.locale()"
        >
          <span aria-hidden="true">{{ code === 'USD' ? '$' : 'S/' }}</span>
          <span [class]="size() === 'lg' ? '' : 'hidden 2xl:inline'" aria-hidden="true">{{
            code
          }}</span>
        </button>
      }
    </hlm-toggle-group>
  `,
})
export class CurrencySwitcher {
  protected readonly i18n = inject(I18nService);
  protected readonly currency = inject(CurrencyService);
  // Soles first, as the site is Peruvian.
  protected readonly codes = [...CURRENCIES].reverse();
  protected readonly itemClass = SWITCH_ITEM_CLASS;
  /** `sm` in the header row, `lg` in the mobile menu. */
  readonly size = input<'sm' | 'lg'>('sm');

  protected choose(code: Currency | Currency[] | null | undefined): void {
    if (typeof code === 'string' && code !== this.currency.currency()) this.currency.set(code);
  }
}
