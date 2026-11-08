import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import type { Currency } from '../analytics/analytics';
import { CurrencyService } from '../currency/currency';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

/** Symbol before the code on the pill (`$ USD`); the menu spells the currency out. */
const SYMBOLS: Record<Currency, string> = { USD: '$', PEN: 'S/' };

@Component({
  selector: 'app-currency-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmDropdownMenuImports, TranslatePipe],
  template: `
    <button
      hlmBtn
      type="button"
      variant="ghost"
      class="shrink-0 px-2.5 font-medium tracking-wide"
      [hlmDropdownMenuTrigger]="currencyMenu"
      [attr.aria-label]="'a11y.chooseCurrency' | translate: i18n.locale()"
    >
      {{ symbols[currency.code()] }} {{ currency.code() }}
    </button>
    <ng-template #currencyMenu>
      <div hlmDropdownMenu class="rounded-3xl p-2">
        @for (code of codes; track code) {
          <button
            type="button"
            hlmDropdownMenuItem
            class="gap-3 rounded-full px-4 py-2.5 font-semibold"
            [class.bg-muted]="code === currency.code()"
            (triggered)="currency.set(code)"
          >
            <span class="w-6">{{ symbols[code] }}</span>
            {{ 'currency.' + code | translate: i18n.locale() }}
          </button>
        }
      </div>
    </ng-template>
  `,
})
export class CurrencySwitcher {
  protected readonly currency = inject(CurrencyService);
  protected readonly i18n = inject(I18nService);
  protected readonly symbols = SYMBOLS;
  protected readonly codes = Object.keys(SYMBOLS) as Currency[];
}
