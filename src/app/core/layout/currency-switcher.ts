import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
import type { Currency } from '../api/booking-api';
import { CURRENCIES, CurrencyService } from '../currency/currency';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

/** Same shape as the language selector: S/ | $, with the code on very wide screens (the header row has no room for it below 2xl). */
@Component({
  selector: 'app-currency-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmToggleGroupImports, TranslatePipe],
  host: { class: 'contents' },
  template: `
    <hlm-toggle-group
      class="shrink-0"
      type="single"
      variant="outline"
      [size]="size()"
      [nullable]="false"
      [value]="currency.currency()"
      (valueChange)="choose($event)"
      [attr.aria-label]="'a11y.chooseCurrency' | translate: i18n.locale()"
    >
      @for (code of codes; track code) {
        <button
          hlmToggleGroupItem
          type="button"
          [value]="code"
          class="font-semibold tracking-wide aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground data-[state=on]:bg-primary lg:max-xl:h-7 lg:max-xl:min-w-7 lg:max-xl:text-xs lg:max-xl:tracking-normal lg:max-xl:group-data-[spacing=0]/toggle-group:px-1 gap-1.5"
          [aria-label]="'currencies.' + code | translate: i18n.locale()"
        >
          <span aria-hidden="true">{{ code === 'USD' ? '$' : 'S/' }}</span>
          <span
            [class]="size() === 'lg' ? 'font-medium' : 'hidden font-medium 2xl:inline'"
            aria-hidden="true"
            >{{ code }}</span
          >
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
  /** `sm` in the header row, `lg` in the mobile menu. */
  readonly size = input<'sm' | 'lg'>('sm');

  protected choose(code: Currency | Currency[] | null | undefined): void {
    if (typeof code === 'string' && code !== this.currency.currency()) this.currency.set(code);
  }
}
