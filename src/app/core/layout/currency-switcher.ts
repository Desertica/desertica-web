import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import type { Currency } from '../api/booking-api';
import { CURRENCIES, CurrencyService } from '../currency/currency';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

/** Same shape as the language switcher: the symbol of the chosen currency and its code, with a menu of the two. */
@Component({
  selector: 'app-currency-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmDropdownMenuImports, NgTemplateOutlet, TranslatePipe],
  template: `
    <button
      hlmBtn
      type="button"
      variant="ghost"
      class="shrink-0 gap-1.5 px-2.5 font-medium tracking-wide uppercase"
      [hlmDropdownMenuTrigger]="currencyMenu"
      [attr.aria-label]="'a11y.chooseCurrency' | translate: i18n.locale()"
    >
      <ng-container [ngTemplateOutlet]="symbol" [ngTemplateOutletContext]="{ $implicit: currency.currency() }" />
      <span class="hidden xl:inline">{{ currency.currency() }}</span>
    </button>
    <ng-template #currencyMenu>
      <div hlmDropdownMenu>
        @for (code of codes; track code) {
          <button type="button" hlmDropdownMenuItem (triggered)="choose(code)">
            <ng-container [ngTemplateOutlet]="symbol" [ngTemplateOutletContext]="{ $implicit: code }" />
            {{ 'currencies.' + code | translate: i18n.locale() }}
          </button>
        }
      </div>
    </ng-template>
    <ng-template #symbol let-code>
      <span class="inline-flex min-w-4 items-center justify-center font-semibold" aria-hidden="true">{{ code === 'USD' ? '$' : 'S/' }}</span>
    </ng-template>
  `,
})
export class CurrencySwitcher {
  protected readonly i18n = inject(I18nService);
  protected readonly currency = inject(CurrencyService);
  protected readonly codes = CURRENCIES;

  protected choose(code: Currency): void {
    this.currency.set(code);
  }
}
